// src/features/assessments/dtos/attempts/submit-project.dto.ts

import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ProjectSubmissionStatus } from 'generated/prisma/enums';

/**
 * Route params for:
 * POST /attempts/:attemptId/project-submission
 */
export class SubmitProjectParamsDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'attemptId must be a string.' })
  @IsNotEmpty({ message: 'attemptId is required.' })
  @IsUUID('4', { message: 'attemptId must be a valid UUID.' })
  readonly attemptId!: string;
}

/**
 * Body for project submission.
 *
 * Learner can submit code link, deploy link, document URL, and note.
 *
 * Do NOT accept:
 * - score
 * - feedback
 * - status
 * - gradedAt
 * - graderId
 */
export class SubmitProjectDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsUrl(
    { require_protocol: true },
    { message: 'githubUrl must be a valid URL.' },
  )
  @MaxLength(1000, { message: 'githubUrl is too long.' })
  readonly githubUrl?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsUrl(
    { require_protocol: true },
    { message: 'deployUrl must be a valid URL.' },
  )
  @MaxLength(1000, { message: 'deployUrl is too long.' })
  readonly deployUrl?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsUrl(
    { require_protocol: true },
    { message: 'documentUrl must be a valid URL.' },
  )
  @MaxLength(1000, { message: 'documentUrl is too long.' })
  readonly documentUrl?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString({ message: 'note must be a string.' })
  @MaxLength(5000, { message: 'note is too long.' })
  readonly note?: string;
}

/**
 * Response after learner submits project.
 */
export class SubmitProjectResponseDto {
  readonly submissionId!: string;
  readonly attemptId!: string;

  readonly status!: ProjectSubmissionStatus;

  readonly githubUrl?: string | null;
  readonly deployUrl?: string | null;
  readonly documentUrl?: string | null;
  readonly note?: string | null;

  readonly submittedAt!: Date;

  /**
   * Usually null until instructor grades it.
   */
  readonly score?: number | null;
  readonly feedback?: string | null;
  readonly gradedAt?: Date | null;

  readonly serverNow!: Date;
}
