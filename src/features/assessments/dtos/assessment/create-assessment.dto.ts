// src/features/assessments/dtos/create-assessment.dto.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  Validate,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { AssessmentType } from 'generated/prisma/enums';

const TITLE_MAX_LENGTH = 255;
const DESCRIPTION_MAX_LENGTH = 10_000;
const MAX_ORDER_VALUE = 10_000;
const MAX_PASSING_SCORE = 100;
const MAX_ATTEMPTS = 10;
const MAX_TIME_LIMIT_MINUTES = 60;
const Max_TOTAL_SCORE = 100;

function trim(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function trimOptional(value: unknown): unknown {
  if (typeof value !== 'string') return value;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

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

@ValidatorConstraint({
  name: 'timeLimitAllowedForAssessmentType',
  async: false,
})
class TimeLimitAllowedForAssessmentTypeConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    const dto = args.object as CreateAssessmentDto;

    if (value === undefined || value === null) return true;

    return dto.type === AssessmentType.QUIZ;
  }

  defaultMessage(): string {
    return 'timeLimitMinutes is only allowed for QUIZ assessments';
  }
}

export class CreateAssessmentDto {
  @ApiProperty({
    example: 'JavaScript Fundamentals Quiz',
    maxLength: TITLE_MAX_LENGTH,
  })
  @Transform(({ value }) => trim(value))
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(TITLE_MAX_LENGTH)
  title!: string;

  @ApiPropertyOptional({
    example:
      'A short assessment covering variables, functions, and control flow.',
    maxLength: DESCRIPTION_MAX_LENGTH,
  })
  @IsOptional()
  @Transform(({ value }) => trimOptional(value))
  @IsString()
  @MinLength(1)
  @MaxLength(DESCRIPTION_MAX_LENGTH)
  description?: string;

  @ApiProperty({
    enum: AssessmentType,
    example: AssessmentType.QUIZ,
    description: 'QUIZ or PROJECT',
  })
  @IsEnum(AssessmentType)
  type!: AssessmentType;

  @ApiPropertyOptional({
    example: 70,
    minimum: 0,
    maximum: 100,
    description: 'Passing score percentage. Example: 70 means 70%.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_PASSING_SCORE)
  passingScore?: number;

  @ApiPropertyOptional({
    example: 3,
    minimum: 1,
    maximum: MAX_ATTEMPTS,
    description: 'Maximum number of attempts. Omit for unlimited attempts.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_ATTEMPTS)
  maxAttempts?: number;

  @ApiPropertyOptional({
    example: 60,
    minimum: 1,
    maximum: MAX_TIME_LIMIT_MINUTES,
    description: 'Time limit in minutes. Only allowed for QUIZ assessments.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_TIME_LIMIT_MINUTES)
  @Validate(TimeLimitAllowedForAssessmentTypeConstraint)
  timeLimitMinutes?: number;

  @ApiPropertyOptional({
    example: '2026-07-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601({ strict: true })
  availableFrom?: string;

  @ApiPropertyOptional({
    example: '2026-08-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601({ strict: true })
  @IsAfterDate('availableFrom')
  availableUntil?: string;
}
