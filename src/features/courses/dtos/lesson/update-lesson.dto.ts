// src/features/courses/dtos/update-lesson.dto.ts

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateLessonDto {
  @ApiPropertyOptional({
    example: 'Introduction to HTML Elements',
    description: 'Lesson title.',
    minLength: 3,
    maxLength: 255,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    example: 'This lesson explains common HTML elements.',
    description: 'Lesson description.',
    maxLength: 2000,
    nullable: true,
  })
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;

    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : null;
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @ApiPropertyOptional({
    description: 'Whether this lesson is active.',
    example: true,
  })
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
