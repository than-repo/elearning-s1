export interface IAssessmentRepository {
  createDraftAssessment(input: CreateAssessmentInput): Promise<Assessment>;

  getNextOrder(courseId: string): Promise<number>;

  findAssessmentById(assessmentId: string): Promise<Assessment | null>;

  updateDraftAssessment(
    assessmentId: string,
    input: UpdateAssessmentInput,
  ): Promise<Assessment>;

  softDeleteAssessment(assessmentId: string): Promise<boolean>;

  findMany(
    where: WhereAssessmentInput,
    orderBy: OrderAssessmentInput,
    skip: number,
    take: number,
  ): Promise<Assessment[]>;

  count(where: WhereAssessmentInput): Promise<number>;
}
export interface CreateAssessmentInput {
  courseId: string;

  title: string;
  description?: string | null;
  type: AssessmentType;

  status?: AssessmentStatus;

  order?: number;

  totalPoints?: number;
  passingScore?: number | null;

  maxAttempts?: number | null;
  timeLimitMinutes?: number | null;

  availableFrom?: Date | null;
  availableUntil?: Date | null;

  isActive?: boolean;
}

export interface UpdateAssessmentInput {
  title?: string;
  description?: string | null;
  type?: AssessmentType;
  status?: AssessmentStatus;

  order?: number;

  totalPoints?: number;
  passingScore?: number | null;

  maxAttempts?: number | null;
  timeLimitMinutes?: number | null;

  availableFrom?: Date | null;
  availableUntil?: Date | null;

  isActive?: boolean;
}

export const AssessmentType = {
  QUIZ: 'QUIZ',
  PROJECT: 'PROJECT',
} as const;

export type AssessmentType =
  (typeof AssessmentType)[keyof typeof AssessmentType];

export const AssessmentStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
} as const;

export type AssessmentStatus =
  (typeof AssessmentStatus)[keyof typeof AssessmentStatus];

export interface Assessment {
  id: string;
  courseId: string;

  title: string;
  description: string | null;
  type: AssessmentType;
  status: AssessmentStatus;

  order: number;

  totalPoints: number;
  passingScore: number | null;

  maxAttempts: number | null;
  timeLimitMinutes: number | null;

  availableFrom: Date | null;
  availableUntil: Date | null;

  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export const AssessmentOrderField = {
  CREATED_AT: 'createdAt',
  UPDATED_AT: 'updatedAt',
  TITLE: 'title',
  ORDER: 'order',
  TOTAL_POINTS: 'totalPoints',
  AVAILABLE_FROM: 'availableFrom',
  AVAILABLE_UNTIL: 'availableUntil',
} as const;

export type AssessmentOrderField =
  (typeof AssessmentOrderField)[keyof typeof AssessmentOrderField];

export const OrderDirection = {
  ASC: 'asc',
  DESC: 'desc',
} as const;

export type OrderDirection =
  (typeof OrderDirection)[keyof typeof OrderDirection];

export interface WhereAssessmentInput {
  id?: string;
  ids?: string[];

  courseId?: string;
  courseIds?: string[];

  type?: AssessmentType;
  types?: AssessmentType[];

  status?: AssessmentStatus;
  statuses?: AssessmentStatus[];

  isActive?: boolean;

  includeDeleted?: boolean;

  search?: string;

  availableFromGte?: Date;

  availableUntilLte?: Date;

  createdAtGte?: Date;

  updatedAtGte?: Date;
}

export interface OrderAssessmentInput {
  field: AssessmentOrderField;
  direction: OrderDirection;
}
