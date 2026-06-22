// src/features/assessments/dtos/update-assessment.dto.ts

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { AssessmentStatus, AssessmentType } from 'generated/prisma/enums';

const trimString = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') {
    return value;
  }

  return value.trim();
};

const isProvided = (_object: unknown, value: unknown): boolean =>
  value !== undefined;

const isProvidedAndNotNull = (_object: unknown, value: unknown): boolean =>
  value !== undefined && value !== null;

export class UpdateAssessmentDto {
  @ApiPropertyOptional({
    example: 'Final JavaScript Quiz',
    maxLength: 255,
  })
  @ValidateIf(isProvided)
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    example:
      'This assessment checks learner understanding of JavaScript basics.',
    nullable: true,
  })
  @ValidateIf(isProvidedAndNotNull)
  @Transform(trimString)
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({
    enum: AssessmentType,
    example: AssessmentType.QUIZ,
  })
  @ValidateIf(isProvided)
  @IsEnum(AssessmentType)
  type?: AssessmentType;

  @ApiPropertyOptional({
    example: 1,
    minimum: 0,
  })
  @ValidateIf(isProvided)
  @Type(() => Number)
  @IsInt()
  @Min(0)
  order?: number;

  @ApiPropertyOptional({
    example: 70,
    minimum: 0,
    nullable: true,
    description:
      'Passing score required to pass the assessment. Null means no passing score.',
  })
  @ValidateIf(isProvidedAndNotNull)
  @Type(() => Number)
  @IsInt()
  @Min(0)
  passingScore?: number | null;

  @ApiPropertyOptional({
    example: 3,
    minimum: 1,
    nullable: true,
    description: 'Maximum allowed attempts. Null means unlimited attempts.',
  })
  @ValidateIf(isProvidedAndNotNull)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxAttempts?: number | null;

  @ApiPropertyOptional({
    example: 60,
    minimum: 1,
    nullable: true,
    description: 'Time limit in minutes. Null means no time limit.',
  })
  @ValidateIf(isProvidedAndNotNull)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  timeLimitMinutes?: number | null;

  @ApiPropertyOptional({
    example: '2026-06-19T08:00:00.000Z',
    nullable: true,
    type: String,
    format: 'date-time',
  })
  @ValidateIf(isProvidedAndNotNull)
  @IsDateString()
  availableFrom?: string | null;

  @ApiPropertyOptional({
    example: '2026-06-30T23:59:59.000Z',
    nullable: true,
    type: String,
    format: 'date-time',
  })
  @ValidateIf(isProvidedAndNotNull)
  @IsDateString()
  availableUntil?: string | null;

  @ApiPropertyOptional({
    example: true,
  })
  @ValidateIf(isProvided)
  @IsBoolean()
  isActive?: boolean;
}
