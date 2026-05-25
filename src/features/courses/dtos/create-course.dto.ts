//src\features\courses\dtos\create-course.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';
import { CourseLevel } from 'generated/prisma/enums';

export class CreateCourseDto {
  @ApiProperty({ example: 'Complete NestJS Masterclass 2026' })
  @IsNotEmpty({ message: 'Title is required' })
  @IsString()
  @MaxLength(160, {
    message: 'Title must be shorter than 160 characters',
  })
  title!: string;

  @ApiProperty({
    example:
      'Master NestJS, Prisma, Cloudinary, and build production-ready apps',
  })
  @IsNotEmpty({ message: 'Short description is required' })
  @IsString()
  shortDescription!: string;

  @ApiProperty({
    example: '<p>Full detailed description with rich content...</p>',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20000, {
    message: 'Description must be shorter than 20,000 characters',
  })
  description?: string;

  @ApiProperty({ example: ['Learn NestJS from zero', 'Build real projects'] })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : []))
  whatYouWillLearn?: string[];

  @ApiProperty({ example: ['Basic TypeScript', 'Node.js basics'] })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : []))
  requirements?: string[];

  @ApiProperty({ enum: CourseLevel, example: 'INTERMEDIATE' })
  @IsNotEmpty()
  @IsEnum(CourseLevel, {
    message:
      'Level must be one of: BEGINNER, INTERMEDIATE, ADVANCE, ALL_LEVELS',
  })
  level!: CourseLevel;

  @ApiProperty({ example: 500000 })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Price cannot be negative' })
  price?: number;

  @ApiProperty({ example: 'en' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  language?: string;

  @ApiProperty()
  @IsOptional()
  @IsInt()
  @Min(0)
  durationInMinutes?: number;

  @ApiProperty({ example: 'https://res.cloudinary.com/.../thumbnail.jpg' })
  @IsUrl()
  @IsOptional()
  thumbnailUrl?: string;

  @ApiProperty({ example: 'elearning/courses/abc123/thumbnail_v1234567890' })
  @IsString()
  @IsOptional()
  cloudinaryPublicId?: string;

  @ApiProperty()
  @IsOptional()
  @IsBoolean()
  certificateEnabled?: boolean;

  @ApiProperty({ example: ['cat-uuid-1', 'cat-uuid-2'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : []))
  categoryIds?: string[];
}
