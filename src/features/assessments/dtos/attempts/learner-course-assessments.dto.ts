import { AssessmentType } from 'generated/prisma/enums';

export class LearnerCourseAssessmentItemDto {
  readonly id!: string;
  readonly title!: string;
  readonly description?: string | null;
  readonly type!: AssessmentType;

  readonly order!: number;
  readonly totalPoints!: number;
  readonly passingScore?: number | null;

  readonly maxAttempts?: number | null;
  readonly timeLimitMinutes?: number | null;

  readonly availableFrom?: Date | null;
  readonly availableUntil?: Date | null;
}

export class LearnerCourseAssessmentsDto {
  readonly assessments!: LearnerCourseAssessmentItemDto[];
  readonly serverNow!: Date;
}
