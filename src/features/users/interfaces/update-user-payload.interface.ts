// users/types/update-user-payload.interface.ts

import { GenderEnum, UserRole } from 'generated/prisma/enums';

export interface UpdateUserPayload {
  fullName?: string;
  email?: string;
  passwordHash?: string;
  phoneNumber?: string | null;
  dateOfBirth?: Date | null;
  gender?: GenderEnum;
  avatarUrl?: string | null;
  role?: UserRole;
  isActive?: boolean;
  emailVerified?: boolean;
}
