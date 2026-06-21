// src/features/assessments/dtos/answers/assessment-answer.dto.ts

import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const ANSWER_MAX_LENGTH = 2_000;
const MAX_WRONG_ANSWERS = 20;

function trimOptional(value: unknown): unknown {
  if (typeof value !== 'string') return value;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function trimStringArrayOptional(value: unknown): unknown {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    return value;
  }

  return value.map((item) => (typeof item === 'string' ? item.trim() : item));
}

export class CreateAssessmentAnswerDto {
  @ApiPropertyOptional({
    example: 'object',
    maxLength: ANSWER_MAX_LENGTH,
    description:
      'Correct option answer. Used for MULTIPLE_CHOICE and TRUE_FALSE questions.',
  })
  @IsOptional()
  @Transform(({ value }) => trimOptional(value))
  @IsString()
  @MinLength(1)
  @MaxLength(ANSWER_MAX_LENGTH)
  correctOptionAnswer?: string;

  @ApiPropertyOptional({
    example: 'JavaScript',
    maxLength: ANSWER_MAX_LENGTH,
    description: 'Correct text answer. Used for FILL_IN_THE_BLANK questions.',
  })
  @IsOptional()
  @Transform(({ value }) => trimOptional(value))
  @IsString()
  @MinLength(1)
  @MaxLength(ANSWER_MAX_LENGTH)
  correctTextAnswer?: string;

  @ApiPropertyOptional({
    example: ['string', 'number', 'undefined'],
    type: [String],
    maxItems: MAX_WRONG_ANSWERS,
    description:
      'Wrong answer options. Usually used for MULTIPLE_CHOICE questions.',
  })
  @IsOptional()
  @Transform(({ value }) => trimStringArrayOptional(value))
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_WRONG_ANSWERS)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(ANSWER_MAX_LENGTH, { each: true })
  wrongAnswers?: string[];
}

export class UpsertAssessmentAnswerDto extends CreateAssessmentAnswerDto {}

export class UpdateAssessmentAnswerDto extends PartialType(
  CreateAssessmentAnswerDto,
) {}
