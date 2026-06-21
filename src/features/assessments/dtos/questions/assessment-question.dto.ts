// src/features/assessments/dtos/questions/assessment-question.dto.ts

import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { AssessmentQuestionType } from 'generated/prisma/enums';

const QUESTION_TEXT_MAX_LENGTH = 10_000;
const EXPLANATION_MAX_LENGTH = 10_000;
const MAX_QUESTION_POINTS = 100;
const MAX_ORDER_VALUE = 10_000;

function trim(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function trimOptional(value: unknown): unknown {
  if (typeof value !== 'string') return value;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export class CreateAssessmentQuestionDto {
  @ApiProperty({
    example: 'What is the output of console.log(typeof null)?',
    maxLength: QUESTION_TEXT_MAX_LENGTH,
  })
  @Transform(({ value }) => trim(value))
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(QUESTION_TEXT_MAX_LENGTH)
  questionText!: string;

  @ApiProperty({
    enum: AssessmentQuestionType,
    example: AssessmentQuestionType.MULTIPLE_CHOICE,
    description:
      'Question type. Allowed values depend on the parent assessment type.',
  })
  @IsEnum(AssessmentQuestionType)
  type!: AssessmentQuestionType;

  @ApiPropertyOptional({
    example: 'In JavaScript, typeof null returns "object" due to a legacy bug.',
    maxLength: EXPLANATION_MAX_LENGTH,
  })
  @IsOptional()
  @Transform(({ value }) => trimOptional(value))
  @IsString()
  @MinLength(1)
  @MaxLength(EXPLANATION_MAX_LENGTH)
  explanation?: string;

  @ApiPropertyOptional({
    example: 10,
    minimum: 1,
    maximum: MAX_QUESTION_POINTS,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_QUESTION_POINTS)
  points?: number;

  @ApiPropertyOptional({
    example: 0,
    minimum: 0,
    maximum: MAX_ORDER_VALUE,
    description:
      'Display order inside the assessment. If omitted, backend should use next order.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_ORDER_VALUE)
  order?: number;
}

export class UpdateAssessmentQuestionDto extends PartialType(
  CreateAssessmentQuestionDto,
) {}
