// src/features/courses/dtos/section-lesson/query-section-lesson.dto.ts

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export const SECTION_SORT_FIELDS = [
  'title',
  'sectionIndex',
  'createdAt',
  'updatedAt',
] as const;

export type SectionSortField = (typeof SECTION_SORT_FIELDS)[number];

export const SORT_DIRECTIONS = ['asc', 'desc'] as const;

export type SortDirection = (typeof SORT_DIRECTIONS)[number];

export class QuerySectionsDto {
  @ApiPropertyOptional({
    description: 'Search keyword for section title.',
    example: 'react',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by active status.',
    example: true,
  })
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    if (value === 'true') return true;
    if (value === 'false') return false;

    return value;
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description:
      'Whether to include soft-deleted sections. Should usually be false.',
    example: false,
    default: false,
  })
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    if (value === 'true') return true;
    if (value === 'false') return false;

    return value;
  })
  @IsOptional()
  @IsBoolean()
  includeDeleted?: boolean;

  @ApiPropertyOptional({
    description: 'Field used for sorting sections.',
    enum: SECTION_SORT_FIELDS,
    example: 'sectionIndex',
    default: 'sectionIndex',
  })
  @IsOptional()
  @IsIn(SECTION_SORT_FIELDS)
  sortField?: SectionSortField;

  @ApiPropertyOptional({
    description: 'Sort direction.',
    enum: SORT_DIRECTIONS,
    example: 'asc',
    default: 'asc',
  })
  @IsOptional()
  @IsIn(SORT_DIRECTIONS)
  sortDirection?: SortDirection;

  @ApiPropertyOptional({
    description: 'Page number.',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of records per page.',
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
