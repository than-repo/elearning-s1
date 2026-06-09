// src/features/courses/dtos/create-category.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({
    example: 'Web Development',
    description: 'Category name (will be used to generate slug automatically)',
  })
  @IsNotEmpty({ message: 'Category name is required' })
  @IsString()
  @MaxLength(100, {
    message: 'Category name must be shorter than 100 characters',
  })
  name!: string;

  @ApiProperty({
    example: 'All courses related to web development, frontend, backend, etc.',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, {
    message: 'Description must be shorter than 500 characters',
  })
  description?: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description:
      'Parent category ID (for nested/sub-categories). Leave empty for top-level category.',
    required: false,
  })
  @IsOptional()
  @IsUUID('4', { message: 'parentId must be a valid UUID' })
  parentId?: string;
}
