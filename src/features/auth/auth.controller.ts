import { ConfigService } from '@nestjs/config';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { UnauthorizedException } from '@nestjs/common';

import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthService } from './services/auth.service';

import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { UserRole } from 'generated/prisma/enums';
import { AuthResponseDto } from './dto/login-response.dto';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import type { RequestWithCookies } from './interfaces/request-with-cookies';
import type { RequestWithUser } from './interfaces/request-with-user';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private setRefreshTokenCookie(res: Response, refreshToken: string): void {
    const maxAge = this.configService.getOrThrow<number>(
      'REFRESH_TOKEN_MAX_AGE_MS',
    );

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge,
      path: '/',
    });
  }

  @Post('register')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiCreatedResponse({
    description: 'User registered successfully',
    type: AuthResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation error or email already taken',
  })
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(registerDto);
    this.setRefreshTokenCookie(res, result.refreshToken);

    const { refreshToken, ...response } = result;
    return response;
  }

  @Post('login')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiOkResponse({
    description: 'User logged in successfully',
    type: AuthResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid credentials' })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(loginDto);
    this.setRefreshTokenCookie(res, result.refreshToken);

    const { refreshToken, ...response } = result;
    return response;
  }

  @Post('refresh')
  @Throttle({ default: { ttl: 30000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using httpOnly cookie' })
  @ApiOkResponse({
    description: 'New access token returned',
    type: AuthResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired refresh token' })
  async refresh(
    @Req() req: RequestWithCookies,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is missing from cookies');
    }

    const result = await this.authService.refreshToken(refreshToken);

    this.setRefreshTokenCookie(res, result.refreshToken);

    const { refreshToken: _, ...response } = result;
    return response;
  }

  // GOOGLE OAUTH
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Start Google OAuth2 login flow' })
  async googleAuth() {
    // Passport will automatically redirect to Google
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google OAuth2 callback' })
  async googleAuthCallback(
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    // req.user contains the JwtPayload from GoogleStrategy
    const result = await this.authService.googleLogin(req.user);

    this.setRefreshTokenCookie(res, result.refreshToken);

    const { refreshToken, ...response } = result;

    // Note: has not redirect to frontend dashboard yet
    // res.redirect(${frontendUrl}/auth/success?token=...')`
    // For now returning Json instead
    return response;
  }

  @Post('logout')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Logout user - revokes refresh token and clears httpOnly cookie',
  })
  @ApiOkResponse({ description: 'User logged out successfully' })
  async logout(
    @Req() req: RequestWithCookies,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refreshToken;

    // Revoke token if it exists
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    // Clear the httpOnly cookie securely
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    return { message: 'Logged out successfully' };
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout from all devices' })
  async logoutAll(@Req() req: Request & { user: any }) {
    await this.authService.logoutAll(req.user.sub);
    return { message: 'Logged out from all devices successfully' };
  }

  // Test endpoints
  @Get('TestAccessToken')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async TestAccessToken(@Req() req: Request & { user: any }) {
    return { success: true, message: 'JWT OK', user: req.user };
  }

  @Get('TestRBAC')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.LEARNER)
  @ApiBearerAuth()
  async getMe(@Req() req: Request & { user: any }) {
    return { success: true, message: 'RBAC OK', user: req.user };
  }
}
