import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  IsDateString,
  IsPhoneNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { RegisterDto } from '../../auth/dto/register.dto';
import { UserRole } from 'generated/prisma/enums';

export class CreateUserDto extends RegisterDto {
  @ApiProperty({
    description: 'USer role, Admin can assign any role',
    example: UserRole.INSTRUCTOR,
    enum: UserRole,
    default: UserRole.LEARNER,
  })
  @IsEnum(UserRole, {
    message: 'Role must be one of: LEARNER, INSTRUCTOR, REVIEWER, ADMIN',
  })
  @IsNotEmpty()
  role: UserRole = UserRole.LEARNER;

  @ApiProperty({
    example: 'https://example.com/avatar.jpg',
  })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
