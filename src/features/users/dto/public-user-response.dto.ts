import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { UserRole, GenderEnum } from 'generated/prisma/enums';

export class PublicUserResponseDto {
  @ApiProperty({ description: 'User ID (UUID)' })
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  fullName!: string;

  @ApiPropertyOptional()
  @Expose()
  avatarUrl?: string | null;

  @ApiPropertyOptional({ enum: GenderEnum })
  @Expose()
  gender?: GenderEnum | null;

  @ApiProperty({ enum: UserRole })
  @Expose()
  role!: UserRole;

  @ApiPropertyOptional()
  @Expose()
  createdAt!: Date; // Only show creation date publicly
}
