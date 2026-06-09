// src/features/courses/dtos/section-lesson/create-section.dto.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSectionDto {
  @ApiProperty({
    description: 'Title of the course section.',
    example: 'Introduction to React Fundamentals',
    minLength: 3,
    maxLength: 255,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional({
    description:
      'Optional short description explaining what this section covers.',
    example:
      'This section introduces the basic concepts, setup, and workflow before building React components.',
    maxLength: 1000,
    nullable: true,
  })
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
