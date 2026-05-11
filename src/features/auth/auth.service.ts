//src\features\auth\auth.service.ts

import { RefreshToken } from './../../../generated/prisma/client';
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthRepository } from './repositories/auth.repository';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { ConfigService } from '@nestjs/config';
import { AuthResponseDto } from './dto/login-response.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Injectable()
export class AuthService {
  private readonly PASSWORD_SALT_ROUNDS = 12; // ← consistent with repository

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existingUser =
      await this.authRepository.findUserByEmailWithIdentities(dto.email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(
      dto.password,
      this.PASSWORD_SALT_ROUNDS,
    );

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

    const refreshExpiresIn =
      this.configService.getOrThrow<string>('JWT_EXPIRES_IN');
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
  async refreshToken(dto: RefreshTokenDto): Promise<AuthResponseDto> {
    // 1. Validate the refresh token
    const refreshTokenRecord =
      await this.authRepository.findRefreshTokenByToken(dto.refreshToken);

    if (!refreshTokenRecord || !refreshTokenRecord.user) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = refreshTokenRecord.user;

    // 2. Revoke old token (token rotation - security best practice)
    await this.authRepository.revokeToken(refreshTokenRecord.id);

    // 3. Generate brand new tokens
    return this.generateAuthResponse(user);
  }
}
