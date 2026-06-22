// src/features/assessments/interfaces/assessment-questions.repository.interface.ts

export interface IAssessmentQuestionRepository {
  createQuestionAndSyncTotalPoints(
    input: CreateAssessmentQuestionInput,
  ): Promise<AssessmentQuestion>;

  getNextOrder(assessmentId: string): Promise<number>;

  findQuestionById(questionId: string): Promise<AssessmentQuestion | null>;

  findMany(
    where: WhereAssessmentQuestionInput,
    orderBy: OrderAssessmentQuestionInput,
    skip: number,
    take: number,
  ): Promise<AssessmentQuestion[]>;

  count(where: WhereAssessmentQuestionInput): Promise<number>;

  updateQuestionAndSyncTotalPoints(
    assessmentId: string,
    questionId: string,
    input: UpdateAssessmentQuestionInput,
  ): Promise<AssessmentQuestion | null>;

  softDeleteQuestionAndSyncTotalPoints(
    assessmentId: string,
    questionId: string,
  ): Promise<boolean>;

  countActiveQuestions(assessmentId: string): Promise<number>;

  sumActiveQuestionPoints(assessmentId: string): Promise<number>;

  syncAssessmentTotalPointsTx(tx: unknown, assessmentId: string): Promise<void>;
}

export const AssessmentQuestionType = {
  MULTIPLE_CHOICE: 'MULTIPLE_CHOICE',
  TRUE_FALSE: 'TRUE_FALSE',
  FILL_IN_THE_BLANK: 'FILL_IN_THE_BLANK',
  PROJECT: 'PROJECT',
} as const;

export type AssessmentQuestionType =
  (typeof AssessmentQuestionType)[keyof typeof AssessmentQuestionType];

export interface CreateAssessmentQuestionInput {
  assessmentId: string;

  questionText: string;
  type: AssessmentQuestionType;

  explanation?: string | null;

  points?: number;
  order?: number;

  isActive?: boolean;
}

export interface UpdateAssessmentQuestionInput {
  questionText?: string;
  type?: AssessmentQuestionType;

  explanation?: string | null;

  points?: number;
  order?: number;

  isActive?: boolean;
}

export interface AssessmentQuestion {
  id: string;
  assessmentId: string;

  questionText: string;
  type: AssessmentQuestionType;

  explanation: string | null;

  points: number;
  order: number;

  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export const AssessmentQuestionOrderField = {
  CREATED_AT: 'createdAt',
  UPDATED_AT: 'updatedAt',
  ORDER: 'order',
  POINTS: 'points',
  TYPE: 'type',
} as const;

export type AssessmentQuestionOrderField =
  (typeof AssessmentQuestionOrderField)[keyof typeof AssessmentQuestionOrderField];

export const OrderDirection = {
  ASC: 'asc',
  DESC: 'desc',
} as const;

export type OrderDirection =
  (typeof OrderDirection)[keyof typeof OrderDirection];

export interface WhereAssessmentQuestionInput {
  id?: string;
  ids?: string[];

  assessmentId?: string;
  assessmentIds?: string[];

  type?: AssessmentQuestionType;
  types?: AssessmentQuestionType[];

  isActive?: boolean;

  includeDeleted?: boolean;

  search?: string;

  pointsGte?: number;
  pointsLte?: number;

  createdAtGte?: Date;
  updatedAtGte?: Date;
}

export interface OrderAssessmentQuestionInput {
  field: AssessmentQuestionOrderField;
  direction: OrderDirection;
}
