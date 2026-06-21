// src/features/assessments/interfaces/assessment-questions.repository.interface.ts

import { AssessmentQuestionType } from 'generated/prisma/enums';

export interface IAssessmentQuestionRepository {
  createQuestion(
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

  updateQuestion(
    questionId: string,
    input: UpdateAssessmentQuestionInput,
  ): Promise<AssessmentQuestion>;

  softDeleteQuestion(questionId: string): Promise<boolean>;

  countActiveQuestions(assessmentId: string): Promise<number>;

  sumActiveQuestionPoints(assessmentId: string): Promise<number>;
}

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
