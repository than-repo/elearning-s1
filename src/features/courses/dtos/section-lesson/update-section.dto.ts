// src/features/courses/dtos/section-lesson/update-section.dto.ts

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateSectionDto {
  @ApiPropertyOptional({
    description: 'Updated title of the course section.',
    example: 'React Fundamentals and Project Setup',
    maxLength: 255,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    description: 'Updated description of the course section.',
    example:
      'This section covers React fundamentals, development setup, and the first component.',
    maxLength: 1000,
    nullable: true,
  })
  @Transform(({ value }) => {
    if (value === null) return null;
    if (typeof value !== 'string') return value;

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

}
