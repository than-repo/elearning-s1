//src\features\auth\dto\register.dto.ts
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { GenderEnum } from 'generated/prisma/enums';

export class RegisterDto {
  @IsNotEmpty({ message: 'Full name is required' })
  @IsString()
  @MinLength(2, { message: 'Full name must be at least 2 characters' })
  @MaxLength(100, { message: 'Full name cannot exceed 100 characters' })
  @Transform(({ value }) => (value ? value.trim() : value))
  fullName!: string;

  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @MaxLength(255)
  @Transform(({ value }) => (value ? value.toLowerCase().trim() : value))
  email!: string;

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

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(20)
  @Transform(({ value }) => value?.trim())
  phoneNumber?: string;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'Date of birth must be a valid ISO date (YYYY-MM-DD)' },
  )
  dateOfBirth?: string;

  @IsOptional()
  @IsEnum(GenderEnum, {
    message: 'Gender must be one of: MALE, FEMALE, OTHER, PREFER_NOT_TO_SAY',
  })
  gender?: GenderEnum;
}
