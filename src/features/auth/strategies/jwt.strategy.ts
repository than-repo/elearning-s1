//src\features\auth\strategies\jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
      passReqToCallback: true,
    });
  }

  /**
   * Called after JWT is verified (signature + expiration).
   * Keep this method extremely lightweight — no database calls.
   * User status checks (isActive, ...) are handled only at refresh time.
   */
  async validate(
    req: Request,
    payload: JwtPayload,
  ): Promise<JwtPayload & { ip?: string; userAgent?: string }> {
    // Basic payload integrity check (defense in depth)
    if (!payload.sub || !payload.email || !payload.role) {
      throw new UnauthorizedException('Invalid JWT payload structure');
    }

    // Attach request context (very useful for logging, rate limiting, or future features)
    return {
      ...payload,
      ip: req.ip || req.ips?.[0],
      userAgent: req.headers['user-agent'] as string | undefined,
    };
  }
}
