////src/features/auth/interfaces/create-local-user.interface.ts
import { GenderEnum } from 'generated/prisma/enums';

export interface CreateLocalUserData {
  fullName: string;
  email: string;
  passwordHash: string;
  phoneNumber?: string;
  dateOfBirth?: Date;
  gender?: GenderEnum;
}
