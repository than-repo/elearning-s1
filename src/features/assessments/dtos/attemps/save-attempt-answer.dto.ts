// src/features/assessments/dtos/attempts/save-attempt-answer.dto.ts

import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

/**
 * Route params for:
 * PATCH /attempts/:attemptId/answers/:questionId
 */
export class SaveAttemptAnswerParamsDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'attemptId must be a string.' })
  @IsNotEmpty({ message: 'attemptId is required.' })
  @IsUUID('4', { message: 'attemptId must be a valid UUID.' })
  readonly attemptId!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'questionId must be a string.' })
  @IsNotEmpty({ message: 'questionId is required.' })
  @IsUUID('4', { message: 'questionId must be a valid UUID.' })
  readonly questionId!: string;
}

/**
 * Body for autosaving learner answer.
 *
 * Keep this simple:
 * - MULTIPLE_CHOICE: answer = selected option value/text
 * - TRUE_FALSE: answer = "true" or "false"
 * - FILL_IN_THE_BLANK: answer = learner typed text
 *
 * Do NOT accept:
 * - isCorrect
 * - pointsEarned
 * - correctAnswer
 * - score
 */
export class SaveAttemptAnswerDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'answer must be a string.' })
  @IsNotEmpty({ message: 'answer is required.' })
  @MaxLength(5000, { message: 'answer is too long.' })
  readonly answer!: string;

  /**
   * Optional client-side snapshot.
   *
   * You can use this later if you want to store richer data,
   * for example selected option label, question version, or editor state.
   *
   * For now, the service may ignore this and build answerSnapshot itself.
   */
  @IsOptional()
  @IsString({ message: 'answerSnapshot must be a string.' })
  @MaxLength(10000, { message: 'answerSnapshot is too long.' })
  readonly answerSnapshot?: string;
}

/**
 * Small response after autosave.
 */
export class SaveAttemptAnswerResponseDto {
  readonly attemptId!: string;
  readonly questionId!: string;

  readonly saved!: boolean;
  readonly savedAt!: Date;

  /**
   * Backend-calculated remaining time.
   * Useful for keeping FE timer in sync.
   */
  readonly remainingSeconds?: number | null;

  readonly serverNow!: Date;
}
