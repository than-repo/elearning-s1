import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { CourseLevel, CourseStatus } from 'generated/prisma/enums';

const ToBoolean = () =>
  Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  });

const TrimToUndefined = () =>
  Transform(({ value }) => {
    if (typeof value !== 'string') {
      return value;
    }

    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  });

export const COURSE_SORT_FIELDS = [
  'title',
  'price',
  'level',
  'status',
  'createdAt',
  'updatedAt',
  'publishedAt',
] as const;

export type CourseSortField = (typeof COURSE_SORT_FIELDS)[number];

export const SORT_DIRECTIONS = ['asc', 'desc'] as const;

export type SortDirection = (typeof SORT_DIRECTIONS)[number];

export class BaseCourseQueryDto {
  @ApiPropertyOptional({ example: 'nestjs', maxLength: 100 })
  @TrimToUndefined()
  @IsString()
  @IsOptional()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: CourseLevel })
  @IsIn(Object.values(CourseLevel))
  @IsOptional()
  level?: CourseLevel;

  @ApiPropertyOptional({ example: 'category-id' })
  @TrimToUndefined()
  @IsUUID('4')
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ example: 0, minimum: 0 })
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  minPrice?: number;

  @ApiPropertyOptional({ example: 100, minimum: 0 })
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  maxPrice?: number;

  @ApiPropertyOptional({ example: 'en' })
  @TrimToUndefined()
  @IsString()
  @IsOptional()
  language?: string;

  @ApiPropertyOptional({ enum: COURSE_SORT_FIELDS })
  @IsIn(COURSE_SORT_FIELDS)
  @IsOptional()
  sortField?: CourseSortField;

  @ApiPropertyOptional({ enum: SORT_DIRECTIONS })
  @IsIn(SORT_DIRECTIONS)
  @IsOptional()
  sortDirection?: SortDirection;

  @ApiPropertyOptional({ example: true })
  @ToBoolean()
  @IsBoolean()
  @IsOptional()
  certificateEnabled?: boolean;

  @ApiPropertyOptional({ example: 'instructor-id' })
  @TrimToUndefined()
  @IsUUID('4')
  @IsOptional()
  instructorId?: string;

  @ApiPropertyOptional({ example: '2026-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  publishedFrom?: string;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.999Z' })
  @IsOptional()
  @IsDateString()
  publishedTo?: string;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;
}

export class AdminCourseQueryDto extends BaseCourseQueryDto {
  @ApiPropertyOptional({ enum: CourseStatus })
  @IsIn(Object.values(CourseStatus))
  @IsOptional()
  status?: CourseStatus;

  @ApiPropertyOptional({ example: true })
  @ToBoolean()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class InstructorCourseQueryDto extends BaseCourseQueryDto {
  @ApiPropertyOptional({ enum: CourseStatus })
  @IsIn(Object.values(CourseStatus))
  @IsOptional()
  status?: CourseStatus;

  @ApiPropertyOptional({ example: true })
  @ToBoolean()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class LearnerCourseQueryDto extends BaseCourseQueryDto {}
