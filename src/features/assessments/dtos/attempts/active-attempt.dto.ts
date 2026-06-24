// src/features/assessments/dtos/attempts/active-attempt.dto.ts

import { AssessmentAttemptStatus } from 'generated/prisma/enums';
import { AssessmentQuestionType } from '../../interfaces/assessment-questions.repository.interface';
import { AssessmentType } from '../../interfaces/assessment.repository.interface';

/**
 * One safe question shown to learner during an active attempt.
 *
 * IMPORTANT:
 * - Do NOT expose correct answer.
 * - Do NOT expose isCorrect.
 * - Do NOT expose pointsEarned before submit.
 */
export class ActiveAttemptQuestionDto {
  readonly questionId!: string;

  readonly questionText!: string;
  readonly type!: AssessmentQuestionType;

  readonly points!: number;
  readonly order!: number;

  /**
   * Used for MULTIPLE_CHOICE or TRUE_FALSE.
   *
   * These options must be generated safely by service layer.
   * They must NOT contain any "isCorrect" flag.
   */
  readonly options?: string[] | null;
}

/**
 * Previously saved learner answer.
 *
 * Used when learner refreshes page or clicks "Continue the test".
 */
export class ActiveAttemptSavedAnswerDto {
  readonly questionId!: string;

  /**
   * The learner's saved answer.
   *
   * Examples:
   * - MULTIPLE_CHOICE: "A" or selected option value
   * - TRUE_FALSE: "true"
   * - FILL_IN_THE_BLANK: "JavaScript"
   */
  readonly answer?: string | null;

  readonly savedAt!: Date;
}

/**
 * Used when assessment type is PROJECT.
 *
 * Your current schema does not have a separate ProjectRequirement table,
 * so this can be built from Assessment.description and/or PROJECT question text.
 */
export class ActiveProjectRequirementDto {
  readonly title!: string;

  readonly description?: string | null;

  /**
   * Main project instruction.
   */
  readonly requirement!: string;

  readonly totalPoints!: number;

  /**
   * Optional helper text.
   */
  readonly note?: string | null;
}

/**
 * Response DTO for active attempt page.
 *
 * Used by:
 * GET /attempts/:attemptId
 */
export class ActiveAttemptDto {
  readonly attemptId!: string;
  readonly assessmentId!: string;

  readonly assessmentTitle!: string;
  readonly assessmentDescription?: string | null;

  readonly type!: AssessmentType;
  readonly status!: AssessmentAttemptStatus;

  readonly attemptNumber!: number;

  readonly totalPoints!: number;
  readonly passingScore?: number | null;

  readonly startedAt!: Date;

  /**
   * If you add expiresAt to AssessmentAttempt, return it directly.
   * If not, service can calculate:
   *
   * startedAt + assessment.timeLimitMinutes
   */
  readonly expiresAt?: Date | null;

  /**
   * Backend-calculated time remaining.
   * FE uses this for countdown display.
   */
  readonly remainingSeconds?: number | null;

  /**
   * Server time for frontend timer synchronization.
   * Do not trust learner device time.
   */
  readonly serverNow!: Date;

  /**
   * Quiz questions.
   *
   * For PROJECT assessment, this can be an empty array.
   */
  readonly questions!: ActiveAttemptQuestionDto[];

  /**
   * Previously saved answers.
   *
   * Used for restore/continue.
   */
  readonly savedAnswers!: ActiveAttemptSavedAnswerDto[];

  /**
   * Project requirement.
   *
   * Only used when type = PROJECT.
   */
  readonly projectRequirement?: ActiveProjectRequirementDto | null;
}
