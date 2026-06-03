// src/common/decorators/current-user.decorator.ts

/**
 * Get UserId from JwtPayload
 * Use standard custom decorators
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from 'src/features/auth/interfaces/jwt-payload.interface';

export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user: JwtPayload }>();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);
