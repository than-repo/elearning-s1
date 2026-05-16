//src\common\interfaces\request-with-user.ts
import { Request } from '@nestjs/common';
import { JwtPayload } from '../../features/auth/interfaces/jwt-payload.interface';

export interface RequestWithUser extends Request {
  user: JwtPayload;
}
