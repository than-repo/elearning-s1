//src\features\auth\interfaces\jwt-payload.interface.ts
import { UserRole } from 'generated/prisma/enums';

export interface JwtPayload {
  /**
   * Subject - User ID (standard JWT claim)
   */
  sub: string;

  /**
   * User email (for quick identification)
   */
  email: string;

  /**
   * User role - this is critical for Role-Based Access Control (RBAC)
   */
  role: UserRole;

  /**
   * Optional claims that JWT automatically adds
   */
  iat?: number;
  exp?: number;
}
