// src/features/users/dto/create-user.dto.ts
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GenderEnum, UserRole } from 'generated/prisma/enums';
import { Transform } from 'class-transformer';

export class CreateUserDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @MinLength(2, { message: 'Full name must be at least 2 characters' })
  @MaxLength(100, { message: 'Full name cannot exceed 100 characters' })
  @Transform(({ value }) => value?.trim())
  fullName!: string;

  @ApiProperty({ example: 'admin@example.com' })
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @MaxLength(255)
  @Transform(({ value }) => value?.toLowerCase().trim())
  email!: string;

  @ApiProperty({ example: 'StrongPass123!' })
  @IsNotEmpty({ message: 'Password is required' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(100, { message: 'Password cannot exceed 100 characters' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    {
      message:
        'Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character (@$!%*?&)',
    },
  )
  password!: string;

  @ApiProperty({ example: '+84123456789', required: false })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(20)
  @Transform(({ value }) => value?.trim())
  phoneNumber?: string;

  @ApiPropertyOptional({ example: '1990-01-01' })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'Date of birth must be a valid ISO date (YYYY-MM-DD)' },
  )
  dateOfBirth?: string;

  @ApiPropertyOptional({ enum: GenderEnum })
  @IsOptional()
  @IsEnum(GenderEnum, {
    message: 'Gender must be one of: MALE, FEMALE, OTHER, PREFER_NOT_TO_SAY',
  })
  gender?: GenderEnum;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @ApiProperty({ example: UserRole.INSTRUCTOR, enum: UserRole })
  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole = UserRole.LEARNER;
}
