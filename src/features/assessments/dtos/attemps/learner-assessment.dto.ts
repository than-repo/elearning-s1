// src/features/assessments/dtos/attempts/learner-assessment.dto.ts

export enum LearnerAssessmentState {
  CAN_START = 'CAN_START',
  CAN_CONTINUE = 'CAN_CONTINUE',
  COMPLETED = 'COMPLETED',
  MAX_ATTEMPTS_REACHED = 'MAX_ATTEMPTS_REACHED',
  NOT_AVAILABLE = 'NOT_AVAILABLE',
  LOCKED = 'LOCKED',
}

export enum LearnerAssessmentAction {
  START = 'START',
  CONTINUE = 'CONTINUE',
  VIEW_RESULT = 'VIEW_RESULT',
  NONE = 'NONE',
}

export class LearnerLatestAttemptDto {
  readonly attemptId!: string;
  readonly attemptNumber!: number;
  readonly status!: string;

  readonly score?: number | null;
  readonly maxScore?: number | null;
  readonly passed!: boolean;

  readonly startedAt!: Date;
  readonly submittedAt?: Date | null;

  /**
   * If the assessment has a time limit, backend should calculate this.
   * FE should not calculate trust-sensitive time by itself.
   */
  readonly expiresAt?: Date | null;
  readonly remainingSeconds?: number | null;
}

export class LearnerAssessmentDto {
  readonly assessmentId!: string;

  readonly title!: string;
  readonly description?: string | null;
  readonly type!: string;

  readonly totalPoints!: number;
  readonly passingScore?: number | null;

  readonly maxAttempts?: number | null;
  readonly timeLimitMinutes?: number | null;

  readonly availableFrom?: Date | null;
  readonly availableUntil?: Date | null;

  /**
   * Attempt summary for this learner.
   */
  readonly attemptsUsed!: number;
  readonly attemptsRemaining?: number | null;

  /**
   * Main state for FE.
   */
  readonly state!: LearnerAssessmentState;

  /**
   * Main button/action for FE.
   */
  readonly primaryAction!: LearnerAssessmentAction;

  /**
   * Latest attempt, if learner has any attempt.
   * If state = CAN_CONTINUE, this should be the active IN_PROGRESS attempt.
   */
  readonly latestAttempt?: LearnerLatestAttemptDto | null;

  /**
   * Backend time. FE should use this for countdown synchronization.
   */
  readonly serverNow!: Date;

  /**
   * Safe human-readable reason for blocked states.
   * Example: "Assessment is not available yet."
   */
  readonly message?: string | null;
}
