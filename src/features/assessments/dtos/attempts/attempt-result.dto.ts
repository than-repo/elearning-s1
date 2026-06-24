// src/features/assessments/dtos/attempts/attempt-result.dto.ts

import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import {
  AssessmentAttemptStatus,
  AssessmentQuestionType,
  AssessmentType,
  ProjectSubmissionStatus,
} from 'generated/prisma/enums';

/**
 * Route params for:
 * POST /attempts/:attemptId/submit
 * GET /attempts/:attemptId/result
 */
export class AttemptResultParamsDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'attemptId must be a string.' })
  @IsNotEmpty({ message: 'attemptId is required.' })
  @IsUUID('4', { message: 'attemptId must be a valid UUID.' })
  readonly attemptId!: string;
}

/**
 * Optional quiz review item.
 *
 * Use this only if your platform allows learners to review answers.
 * Do NOT include correctAnswer if you want to hide answer keys.
 */
export class AttemptResultAnswerDto {
  readonly questionId!: string;

  readonly questionText!: string;
  readonly questionType!: AssessmentQuestionType;

  readonly points!: number;
  readonly pointsEarned?: number | null;

  readonly learnerAnswer?: string | null;

  readonly isCorrect?: boolean | null;

  /**
   * Optional.
   * Only expose this when your assessment policy allows showing correct answers.
   */
  readonly correctAnswer?: string | null;

  readonly explanation?: string | null;
}

/**
 * Project result summary.
 *
 * Used only when assessment type = PROJECT.
 */
export class AttemptResultProjectSubmissionDto {
  readonly submissionId!: string;

  readonly status!: ProjectSubmissionStatus;

  readonly githubUrl?: string | null;
  readonly deployUrl?: string | null;
  readonly documentUrl?: string | null;
  readonly note?: string | null;

  readonly score?: number | null;
  readonly feedback?: string | null;

  readonly submittedAt!: Date;
  readonly gradedAt?: Date | null;
}

/**
 * Main result DTO.
 *
 * Used after submit and on result page.
 */
export class AttemptResultDto {
  readonly attemptId!: string;
  readonly assessmentId!: string;

  readonly assessmentTitle!: string;
  readonly assessmentType!: AssessmentType;

  readonly attemptNumber!: number;
  readonly status!: AssessmentAttemptStatus;

  readonly score?: number | null;
  readonly maxScore?: number | null;
  readonly passed!: boolean;

  readonly startedAt!: Date;
  readonly submittedAt?: Date | null;

  /**
   * FE can use this to show/hide retake button.
   * Backend decides this based on maxAttempts and assessment availability.
   */
  readonly canRetake!: boolean;

  /**
   * FE can use this to show/hide review button.
   */
  readonly canReview!: boolean;

  /**
   * Optional quiz review data.
   * Empty array if review is disabled.
   */
  readonly answers?: AttemptResultAnswerDto[];

  /**
   * Optional project submission data.
   * Null for quiz assessment.
   */
  readonly projectSubmission?: AttemptResultProjectSubmissionDto | null;

  readonly serverNow!: Date;
}
