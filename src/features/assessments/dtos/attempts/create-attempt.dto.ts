// src/features/assessments/dtos/attempts/create-attempt.dto.ts

import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export enum CreateAttemptAction {
  CREATED = 'CREATED',
  RESUMED = 'RESUMED',
}

export class CreateAttemptParamsDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'assessmentId must be a string.' })
  @IsNotEmpty({ message: 'assessmentId is required.' })
  @IsUUID('4', { message: 'assessmentId must be a valid UUID.' })
  readonly assessmentId!: string;
}

/**
 * Response after learner starts or resumes an attempt.
 * The full attempt page data belongs to active-attempt.dto.ts in Step 3.
 */
export class CreateAttemptResponseDto {
  readonly action!: CreateAttemptAction;

  readonly attemptId!: string;
  readonly assessmentId!: string;
  readonly attemptNumber!: number;

  readonly status!: string;

  readonly startedAt!: Date;
  readonly expiresAt?: Date | null;

  /**
   * Backend-calculated remaining time.
   * FE uses this to show timer.
   */
  readonly remainingSeconds?: number | null;

  /**
   * Backend time for FE timer synchronization.
   */
  readonly serverNow!: Date;
}
