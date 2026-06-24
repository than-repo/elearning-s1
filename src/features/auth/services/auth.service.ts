//src\features\auth\auth.service.ts

import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { RegisterDto } from '../dtos/register.dto';
import { LoginDto } from '../dtos/login.dto';
import { AuthRepository } from '../repositories/auth.repository';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { ConfigService } from '@nestjs/config';
import { AuthResponseDto } from '../dtos/login-response.dto';

@Injectable()
export class AuthService {
  private readonly saltRounds: number;
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    const rounds = parseInt(
      this.configService.getOrThrow('PASSWORD_SALT_ROUNDS'),
      10,
    );

    if (isNaN(rounds) || rounds < 10) {
      throw new Error('PASSWORD_SALT_ROUNDS must be a number >= 10');
    }

    this.saltRounds = rounds;
  }

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existingUser =
      await this.authRepository.findUserByEmailWithIdentities(dto.email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.saltRounds);

    const newUser = await this.authRepository.createLocalUser({
      fullName: dto.fullName,
      email: dto.email,
      passwordHash,
      phoneNumber: dto.phoneNumber,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      gender: dto.gender,
    });

    return this.generateAuthResponse(newUser);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.authRepository.findUserByEmailWithIdentities(
      dto.email,
    );

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account has been deactivated');
    }
    // if (!user.emailVerified) {
    //   throw new UnauthorizedException(
    //     'Please verify your email address before logging in',
    //   );
    // }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.generateAuthResponse(user);
  }

  /**
   * Private helper - removes duplication between register n login
   */
  private async generateAuthResponse(user: any): Promise<AuthResponseDto> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    const refreshExpiresIn = this.configService.getOrThrow<string>(
      'REFRESH_TOKEN_EXPIRES_IN',
    );
    const expiresAt = this.calculateExpiry(refreshExpiresIn);

    const { refreshToken } = await this.authRepository.createRefreshToken({
      userId: user.id,
      expiresAt,
    });

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
      accessToken,
      refreshToken,
    };
  }

  private calculateExpiry(expiresIn: string): Date {
    const ms = this.parseMs(expiresIn);
    return new Date(Date.now() + ms);
  }

  private parseMs(value: string): number {
    const match = value.match(/^(\d+)([dhms])?$/i);
    if (!match) {
      throw new Error(`Invalid REFRESH_TOKEN_EXPIRES_IN format: ${value}`);
    }

    const num = parseInt(match[1], 10);
    const unit = (match[2] || 'd').toLowerCase();

    switch (unit) {
      case 'd':
        return num * 24 * 60 * 60 * 1000;
      case 'h':
        return num * 60 * 60 * 1000;
      case 'm':
        return num * 60 * 1000;
      case 's':
        return num * 1000;
      default:
        return num * 24 * 60 * 60 * 1000;
    }
  }

  //REFRESH TOKEN METHOD
  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    if (!refreshToken || typeof refreshToken !== 'string') {
      throw new UnauthorizedException('Invalid refresh token format');
    }
    const refreshTokenRecord =
      await this.authRepository.findRefreshTokenByToken(refreshToken);

    if (!refreshTokenRecord?.user) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.authRepository.revokeToken(refreshTokenRecord.id);

    return this.generateAuthResponse(refreshTokenRecord.user);
  }

  async validateGoogleUser(
    profile: any,
    accessToken: string,
    refreshToken: string,
  ) {
    const email = profile.emails?.[0]?.value?.toLowerCase();
    const googleId = profile.id;
    const fullName =
      profile.displayName ||
      `${profile.name?.givenName} ${profile.name?.familyName}`;

    if (!email || !googleId) {
      throw new UnauthorizedException('Invalid Google profile data');
    }

    return this.authRepository.findOrCreateGoogleUser({
      email,
      fullName,
      googleId,
      accessToken,
      refreshToken,
      avatarUrl: profile.photos?.[0]?.value,
    });
  }

  /**
   * Optional helper - can be used later for Google login controller
   */
  async googleLogin(payload: JwtPayload): Promise<AuthResponseDto> {
    // reuse the same flow as local login (token generation + cookie)
    const user = await this.authRepository.findUserById(payload.sub);
    return this.generateAuthResponse(user);
  }

  async logout(refreshToken: string): Promise<{ message: string }> {
    // Try to revoke the token (it may already be expired/revoked — don't throw)
    const record =
      await this.authRepository.findRefreshTokenByToken(refreshToken);
    if (record) {
      await this.authRepository.revokeToken(record.id);
    }

    return { message: 'Logged out successfully' };
  }
  async logoutAll(userId: string): Promise<{ message: string }> {
    await this.authRepository.revokeAllUserRefreshTokens(userId);
    return { message: 'Logged out from all devices successfully' };
  }
}
