import { GenderEnum, UserRole } from 'generated/prisma/enums';

export interface UserSelectResult {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  dateOfBirth: Date | null;
  gender: GenderEnum | null;
  avatarUrl: string | null;
  role: UserRole;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
}
