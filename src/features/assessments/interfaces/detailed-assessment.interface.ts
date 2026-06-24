import { AssessmentQuestionType } from './assessment-questions.repository.interface';
import {
  AssessmentReviewContent,
  AssessmentReviewTiming,
  AssessmentStatus,
  AssessmentType,
} from './assessment.repository.interface';

export interface IDetailedAssessmentRepository {
  findDetailedAssessment(
    assessmentId: string,
  ): Promise<DetailedAssessment | null>;
}

export type DomainJsonPrimitive = string | number | boolean | null;

export type DomainJsonValue =
  | DomainJsonPrimitive
  | DomainJsonObject
  | DomainJsonArray;

export interface DomainJsonObject {
  [key: string]: DomainJsonValue;
}

export type DomainJsonArray = DomainJsonValue[];
export interface DetailedAssessment {
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

  reviewTiming: AssessmentReviewTiming;
  reviewContent: AssessmentReviewContent;

  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  questions: DetailedAssessmentQuestion[];
}

export interface DetailedAssessmentQuestion {
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

  answer: DetailedAssessmentAnswer | null;
}

export interface DetailedAssessmentAnswer {
  id: string;
  questionId: string;

  correctOptionAnswer: string | null;
  correctTextAnswer: string | null;

  wrongAnswers: DomainJsonValue | null;

  createdAt: Date;
  updatedAt: Date;
}
