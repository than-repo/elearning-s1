// src/features/courses/dtos/course/create-course.dto.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { CourseLevel } from 'generated/prisma/enums';

export class CreateCourseDto {
  @ApiProperty({
    example: 'NestJS Masterclass',
    minLength: 3,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  title!: string;

  @ApiProperty({
    example: 'Learn how to build production-ready APIs with NestJS.',
    minLength: 10,
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(500)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  shortDescription!: string;

  @ApiPropertyOptional({
    example:
      'This course covers modules, controllers, services, DTOs, Prisma, authentication, and deployment.',
    maxLength: 10000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(10000)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  description?: string;

  @ApiPropertyOptional({
    type: [String],
    maxItems: 25,
    example: [
      'Understand NestJS architecture',
      'Build REST APIs',
      'Use Prisma with NestJS',
    ],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(25)
  @IsString({ each: true })
  @MaxLength(300, { each: true })
  @MinLength(2, { each: true })
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value.map((item) => (typeof item === 'string' ? item.trim() : item))
      : value,
  )
  whatYouWillLearn?: string[];

  @ApiPropertyOptional({
    type: [String],
    maxItems: 25,
    example: ['Basic TypeScript knowledge', 'Basic Node.js knowledge'],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(25)
  @IsString({ each: true })
  @MaxLength(300, { each: true })
  @MinLength(2, { each: true })
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value.map((item) => (typeof item === 'string' ? item.trim() : item))
      : value,
  )
  requirements?: string[];

  @ApiProperty({
    enum: CourseLevel,
    example: CourseLevel.BEGINNER,
  })
  @IsEnum(CourseLevel)
  level!: CourseLevel;

  @ApiPropertyOptional({
    example: 49.99,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    return Number(value);
  })
  price?: number;

  @ApiPropertyOptional({
    example: 'English',
    maxLength: 50,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  language?: string;

  @ApiPropertyOptional({
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;

    return value;
  })
  certificateEnabled?: boolean;

  @ApiProperty({
    type: [String],
    example: ['550e8400-e29b-41d4-a716-446655440000'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  @IsNotEmpty({ each: true })
  categoryIds!: string[];
}
