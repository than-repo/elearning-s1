//src\features\users\interfaces\create-user-payload.interface.ts
import { GenderEnum, UserRole } from 'generated/prisma/enums';

export interface CreateUserPayload {
  fullName: string;
  email: string;
  passwordHash?: string;
  phoneNumber?: string | null;
  dateOfBirth?: Date | null;
  gender?: GenderEnum | null;
  avatarUrl?: string | null;
  role: UserRole;
  isActive: boolean;
  emailVerified?: boolean;
}
