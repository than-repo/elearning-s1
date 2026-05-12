import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateUserDto } from '../../users/dto/create-user.dto';
import { UserRole } from 'generated/prisma/enums';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional({
    enum: UserRole,
    description: 'Change user role (admin only)',
    example: UserRole.INSTRUCTOR,
  })
  @IsOptional()
  @IsEnum(UserRole, {
    message: 'Role must be one of: LEARNER, INSTRUCTOR, REVIEWER, ADMIN',
  })
  role?: UserRole;

  // Extra admin-only fields
  @ApiPropertyOptional({ example: 'https://example.com/new-avatar.jpg' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  emailVerified?: boolean;
}
