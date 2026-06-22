import { IsEnum } from 'class-validator';
// src/features/assessments/dtos/update-published-assessment.dto.ts

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  Max,
  Min,
  Validate,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import {
  AssessmentReviewContent,
  AssessmentReviewTiming,
} from '../../interfaces/assessment.repository.interface';

const MAX_ATTEMPTS = 10;
const MAX_TIME_LIMIT_MINUTES = 60;

function IsAfterDate(
  relatedPropertyName: string,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return Validate(
    IsAfterDateConstraint,
    [relatedPropertyName],
    validationOptions,
  );
}

@ValidatorConstraint({ name: 'isAfterDate', async: false })
class IsAfterDateConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    const [relatedPropertyName] = args.constraints as [string];
    const object = args.object as Record<string, unknown>;

    const relatedValue = object[relatedPropertyName];

    if (!value || !relatedValue) return true;

    const currentDate = new Date(String(value));
    const relatedDate = new Date(String(relatedValue));

    if (
      Number.isNaN(currentDate.getTime()) ||
      Number.isNaN(relatedDate.getTime())
    ) {
      return true;
    }

    return currentDate.getTime() > relatedDate.getTime();
  }

  defaultMessage(args: ValidationArguments): string {
    const [relatedPropertyName] = args.constraints as [string];

    return `${args.property} must be after ${relatedPropertyName}`;
  }
}

export class UpdatePublishedAssessmentDto {
  @ApiPropertyOptional({
    example: '2026-07-01T00:00:00.000Z',
    nullable: true,
    type: String,
    format: 'date-time',
    description:
      'When learners can start accessing the assessment. Null means available immediately.',
  })
  @IsOptional()
  @IsDateString()
  availableFrom?: string | null;

  @ApiPropertyOptional({
    example: '2026-08-01T00:00:00.000Z',
    nullable: true,
    type: String,
    format: 'date-time',
    description:
      'When learners can no longer access the assessment. Null means no end date.',
  })
  @IsOptional()
  @IsDateString()
  @IsAfterDate('availableFrom')
  availableUntil?: string | null;

  @ApiPropertyOptional({
    example: 3,
    minimum: 1,
    maximum: MAX_ATTEMPTS,
    nullable: true,
    description:
      'Maximum allowed attempts. Null means unlimited attempts. Safe to update after publish.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_ATTEMPTS)
  maxAttempts?: number | null;

  @ApiPropertyOptional({
    example: 60,
    minimum: 1,
    maximum: MAX_TIME_LIMIT_MINUTES,
    nullable: true,
    description:
      'Time limit in minutes for quiz assessments. Null means no time limit.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_TIME_LIMIT_MINUTES)
  timeLimitMinutes?: number | null;

  @ApiPropertyOptional({
    example: 'AFTER_SUBMIT',
    nullable: true,
    description: "Review timing for learner's attempts",
  })
  @IsOptional()
  @IsEnum(AssessmentReviewTiming)
  assessmentReviewTiming?: AssessmentReviewTiming;

  @ApiPropertyOptional({
    example: 'SCORE_ONLY',
    nullable: true,
    description: "Review content for learner's attempts",
  })
  @IsOptional()
  @IsEnum(AssessmentReviewContent)
  assessmentReviewContent?: AssessmentReviewContent;

  @ApiPropertyOptional({
    example: true,
    description:
      'Enable or disable visibility/access without changing assessment content.',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
