import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { UserRole, GenderEnum } from 'generated/prisma/enums';

export class UserResponseDto {
  @ApiProperty({ description: 'User ID (UUID)' })
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  fullName!: string;

  @ApiProperty()
  @Expose()
  email!: string;

  @ApiPropertyOptional()
  @Expose()
  phoneNumber?: string;

  @ApiPropertyOptional({ description: 'ISO date string' })
  @Expose()
  dateOfBirth?: Date | null;

  @ApiPropertyOptional({ enum: GenderEnum })
  @Expose()
  gender?: GenderEnum | null;

  @ApiPropertyOptional()
  @Expose()
  avatarUrl?: string | null;

  @ApiProperty({ enum: UserRole })
  @Expose()
  role!: UserRole;

  @ApiProperty()
  @Expose()
  isActive!: boolean;

  @ApiProperty()
  @Expose()
  emailVerified!: boolean;

  @ApiProperty()
  @Expose()
  createdAt!: Date;

  @ApiProperty()
  @Expose()
  updatedAt!: Date;

  @ApiPropertyOptional()
  @Expose()
  lastLoginAt?: Date | null;
}
