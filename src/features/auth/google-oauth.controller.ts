import { ConfigService } from '@nestjs/config';
import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { AuthService } from './services/auth.service';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import type { RequestWithUser } from '../../common/interfaces/request-with-user';

@ApiTags('Auth')
@Controller('auth')
export class GoogleOAuthController {
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

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google OAuth2 callback' })
  async googleAuthCallback(
    @Req() req: RequestWithUser,
    @Res() res: Response,
  ) {
    const result = await this.authService.googleLogin(req.user);

    this.setRefreshTokenCookie(res, result.refreshToken);

    const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');
    return res.redirect(`${frontendUrl}/auth/google/success`);
  }
}
