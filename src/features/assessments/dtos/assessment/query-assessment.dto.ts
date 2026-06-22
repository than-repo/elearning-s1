// src/features/assessments/dtos/assessment-query.dto.ts

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
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
  AssessmentOrderField,
  AssessmentStatus,
  AssessmentType,
  OrderDirection,
} from '../../interfaces/assessment.repository.interface';

export const ASSESSMENT_QUERY_DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
  ORDER_BY: AssessmentOrderField.ORDER,
  ORDER_DIRECTION: OrderDirection.ASC,
} as const;

const trimString = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const toBoolean = ({ value }: { value: unknown }): unknown => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value !== 'string') {
    return value;
  }

  const normalized = value.trim().toLowerCase();

  if (['true', '1', 'yes'].includes(normalized)) {
    return true;
  }

  if (['false', '0', 'no'].includes(normalized)) {
    return false;
  }

  return value;
};

const toStringArray = ({ value }: { value: unknown }): unknown => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const values = Array.isArray(value) ? value : [value];

  const result = values
    .flatMap((item) => String(item).split(','))
    .map((item) => item.trim())
    .filter(Boolean);

  return result.length > 0 ? result : undefined;
};

const toNumber = ({ value }: { value: unknown }): unknown => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const numberValue = Number(value);

  return Number.isNaN(numberValue) ? value : numberValue;
};

export class AssessmentQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by assessment ID.',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @Transform(trimString)
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiPropertyOptional({
    description:
      'Filter by multiple assessment IDs. Supports comma-separated values.',
    type: [String],
  })
  @Transform(toStringArray)
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  ids?: string[];

  @ApiPropertyOptional({
    description: 'Filter by course ID.',
    example: '770e8400-e29b-41d4-a716-446655440000',
  })
  @Transform(trimString)
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiPropertyOptional({
    enum: AssessmentType,
    example: AssessmentType.QUIZ,
  })
  @Transform(trimString)
  @IsOptional()
  @IsEnum(AssessmentType)
  type?: AssessmentType;

  @ApiPropertyOptional({
    enum: AssessmentType,
    isArray: true,
    description:
      'Filter by multiple assessment types. Supports comma-separated values.',
  })
  @Transform(toStringArray)
  @IsOptional()
  @IsArray()
  @IsEnum(AssessmentType, { each: true })
  types?: AssessmentType[];

  @ApiPropertyOptional({
    enum: AssessmentStatus,
    example: AssessmentStatus.PUBLISHED,
  })
  @Transform(trimString)
  @IsOptional()
  @IsEnum(AssessmentStatus)
  status?: AssessmentStatus;

  @ApiPropertyOptional({
    enum: AssessmentStatus,
    isArray: true,
    description:
      'Filter by multiple assessment statuses. Supports comma-separated values.',
  })
  @Transform(toStringArray)
  @IsOptional()
  @IsArray()
  @IsEnum(AssessmentStatus, { each: true })
  statuses?: AssessmentStatus[];

  @ApiPropertyOptional({ example: true })
  @Transform(toBoolean)
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Include soft-deleted assessments. Instructor/admin only.',
    example: false,
  })
  @Transform(toBoolean)
  @IsOptional()
  @IsBoolean()
  includeDeleted?: boolean;

  @ApiPropertyOptional({
    description: 'Search by title or description.',
    example: 'javascript quiz',
    maxLength: 100,
  })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({
    example: '2026-06-01T00:00:00.000Z',
    type: String,
    format: 'date-time',
  })
  @Transform(trimString)
  @IsOptional()
  @IsDateString()
  availableFromGte?: string;

  @ApiPropertyOptional({
    example: '2026-06-30T23:59:59.000Z',
    type: String,
    format: 'date-time',
  })
  @Transform(trimString)
  @IsOptional()
  @IsDateString()
  availableUntilLte?: string;

  @ApiPropertyOptional({
    example: '2026-06-01T00:00:00.000Z',
    type: String,
    format: 'date-time',
  })
  @Transform(trimString)
  @IsOptional()
  @IsDateString()
  createdAtGte?: string;

  @ApiPropertyOptional({
    example: '2026-06-01T00:00:00.000Z',
    type: String,
    format: 'date-time',
  })
  @Transform(trimString)
  @IsOptional()
  @IsDateString()
  updatedAtGte?: string;

  @ApiPropertyOptional({
    enum: AssessmentOrderField,
    example: AssessmentOrderField.ORDER,
    default: ASSESSMENT_QUERY_DEFAULTS.ORDER_BY,
  })
  @Transform(trimString)
  @IsOptional()
  @IsEnum(AssessmentOrderField)
  orderBy?: AssessmentOrderField;

  @ApiPropertyOptional({
    enum: OrderDirection,
    example: OrderDirection.ASC,
    default: ASSESSMENT_QUERY_DEFAULTS.ORDER_DIRECTION,
  })
  @Transform(trimString)
  @IsOptional()
  @IsEnum(OrderDirection)
  orderDirection?: OrderDirection;

  @ApiPropertyOptional({
    example: ASSESSMENT_QUERY_DEFAULTS.PAGE,
    minimum: 1,
    default: ASSESSMENT_QUERY_DEFAULTS.PAGE,
  })
  @Transform(toNumber)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: ASSESSMENT_QUERY_DEFAULTS.LIMIT,
    minimum: 1,
    maximum: ASSESSMENT_QUERY_DEFAULTS.MAX_LIMIT,
    default: ASSESSMENT_QUERY_DEFAULTS.LIMIT,
  })
  @Transform(toNumber)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(ASSESSMENT_QUERY_DEFAULTS.MAX_LIMIT)
  limit?: number = 10;
}
