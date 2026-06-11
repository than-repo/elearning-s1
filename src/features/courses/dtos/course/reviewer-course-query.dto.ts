// src/features/courses/dtos/reviewer-course-query.dto.ts

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  CourseLevel,
  CourseReviewStatus,
  CourseStatus,
} from 'generated/prisma/enums';

export enum ReviewerCourseSortField {
  TITLE = 'title',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  SUBMITTED_AT = 'submittedAt',
  REVIEWED_AT = 'reviewedAt',
}

export enum AvailableReviewerCourseSortField {
  TITLE = 'title',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc',
}

export class ReviewerCourseQueryDto {
  @ApiPropertyOptional({
    example: 'nestjs',
    description: 'Search by course title, short description, or description',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  search?: string;

  @ApiPropertyOptional({
    enum: CourseLevel,
    example: CourseLevel.BEGINNER,
    description: 'Filter courses by level',
  })
  @IsOptional()
  @IsEnum(CourseLevel)
  level?: CourseLevel;

  @ApiPropertyOptional({
    enum: CourseStatus,
    example: CourseStatus.IN_REVIEW,
    description: 'Filter courses by course status',
  })
  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;

  @ApiPropertyOptional({
    enum: CourseReviewStatus,
    example: CourseReviewStatus.PENDING,
    description: 'Filter courses by review status',
  })
  @IsOptional()
  @IsEnum(CourseReviewStatus)
  reviewStatus?: CourseReviewStatus;

  @ApiPropertyOptional({
    example: 'f7f6d63d-2e14-42d7-b2a7-69a75b9a6f08',
    description: 'Filter courses by category ID',
  })
  @IsOptional()
  @IsUUID('4')
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  categoryId?: string;

  @ApiPropertyOptional({
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 10,
    minimum: 1,
    maximum: 50,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;

  @ApiPropertyOptional({
    enum: ReviewerCourseSortField,
    example: ReviewerCourseSortField.SUBMITTED_AT,
    default: ReviewerCourseSortField.SUBMITTED_AT,
  })
  @IsOptional()
  @IsEnum(ReviewerCourseSortField)
  sortField?: ReviewerCourseSortField = ReviewerCourseSortField.SUBMITTED_AT;

  @ApiPropertyOptional({
    enum: SortDirection,
    example: SortDirection.DESC,
    default: SortDirection.DESC,
  })
  @IsOptional()
  @IsEnum(SortDirection)
  sortDirection?: SortDirection = SortDirection.DESC;
}

export class AvailableReviewerCourseQueryDto {
  @ApiPropertyOptional({
    example: 'nestjs',
    description: 'Search by course title, short description, or description',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  search?: string;

  @ApiPropertyOptional({
    enum: CourseLevel,
    example: CourseLevel.BEGINNER,
    description: 'Filter courses by level',
  })
  @IsOptional()
  @IsEnum(CourseLevel)
  level?: CourseLevel;

  @ApiPropertyOptional({
    example: 'f7f6d63d-2e14-42d7-b2a7-69a75b9a6f08',
    description: 'Filter courses by category ID',
  })
  @IsOptional()
  @IsUUID('4')
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  categoryId?: string;

  @ApiPropertyOptional({
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 10,
    minimum: 1,
    maximum: 50,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;

  @ApiPropertyOptional({
    enum: AvailableReviewerCourseSortField,
    example: AvailableReviewerCourseSortField.UPDATED_AT,
    default: AvailableReviewerCourseSortField.UPDATED_AT,
  })
  @IsOptional()
  @IsEnum(AvailableReviewerCourseSortField)
  sortField?: AvailableReviewerCourseSortField =
    AvailableReviewerCourseSortField.UPDATED_AT;

  @ApiPropertyOptional({
    enum: SortDirection,
    example: SortDirection.DESC,
    default: SortDirection.DESC,
  })
  @IsOptional()
  @IsEnum(SortDirection)
  sortDirection?: SortDirection = SortDirection.DESC;
}
