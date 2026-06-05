//src\features\courses\dtos\lesson\query-lessons.dto.ts

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export enum LessonSortFieldDto {
  TITLE = 'title',
  LESSON_INDEX = 'lessonIndex',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export enum SortDirectionDto {
  ASC = 'asc',
  DESC = 'desc',
}

export class QueryLessonsDto {
  @ApiPropertyOptional({
    example: 'html',
    description: 'Search lessons by title.',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Filter lessons by active status.',
  })
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Include soft-deleted lessons. Usually owner/admin only.',
    default: false,
  })
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsOptional()
  @IsBoolean()
  includeDeleted?: boolean;

  @ApiPropertyOptional({
    enum: LessonSortFieldDto,
    example: LessonSortFieldDto.LESSON_INDEX,
    default: LessonSortFieldDto.LESSON_INDEX,
  })
  @IsOptional()
  @IsEnum(LessonSortFieldDto)
  sortField?: LessonSortFieldDto = LessonSortFieldDto.LESSON_INDEX;

  @ApiPropertyOptional({
    enum: SortDirectionDto,
    example: SortDirectionDto.ASC,
    default: SortDirectionDto.ASC,
  })
  @IsOptional()
  @IsEnum(SortDirectionDto)
  sortDirection?: SortDirectionDto = SortDirectionDto.ASC;

  @ApiPropertyOptional({
    example: 1,
    default: 1,
    minimum: 1,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 10,
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}
