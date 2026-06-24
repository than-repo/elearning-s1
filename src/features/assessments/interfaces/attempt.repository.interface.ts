import {
  AssessmentAttemptStatus,
  AssessmentStatus,
  AssessmentType,
  EnrollmentStatus,
  ProjectSubmissionStatus,
} from 'generated/prisma/enums';
import { AssessmentQuestionType } from './assessment-questions.repository.interface';

export interface LearnerCourseAssessmentListRecord {
  id: string;
  courseId: string;

  title: string;
  description: string | null;
  type: AssessmentType;

  order: number;
  totalPoints: number;
  passingScore: number | null;

  maxAttempts: number | null;
  timeLimitMinutes: number | null;

  availableFrom: Date | null;
  availableUntil: Date | null;
}

export interface LearnerAssessmentEntryRecord {
  id: string;
  courseId: string;

  title: string;
  description: string | null;
  type: AssessmentType;
  status: AssessmentStatus;

  totalPoints: number;
  passingScore: number | null;

  maxAttempts: number | null;
  timeLimitMinutes: number | null;

  availableFrom: Date | null;
  availableUntil: Date | null;

  isActive: boolean;
  deletedAt: Date | null;
}

export interface LearnerEnrollmentRecord {
  id: string;
  userId: string;
  courseId: string;
  status: EnrollmentStatus;
  isActive: boolean;
  deletedAt: Date | null;
}

export interface LearnerAttemptSummaryRecord {
  id: string;
  assessmentId: string;
  learnerId: string;

  attemptNumber: number;
  status: AssessmentAttemptStatus;

  score: number | null;
  maxScore: number | null;
  passed: boolean;

  startedAt: Date;
  submittedAt: Date | null;
}

export interface CreateAttemptData {
  assessmentId: string;
  learnerId: string;
  attemptNumber: number;
  status: AssessmentAttemptStatus;
  score: number | null;
  maxScore: number | null;
  passed: boolean;
}

export interface CreateOrResumeAttemptTransactionData {
  assessmentId: string;
  learnerId: string;
  maxAttempts: number | null;
  status: AssessmentAttemptStatus;
  score: number | null;
  maxScore: number | null;
  passed: boolean;
}

export type CreateOrResumeAttemptTransactionResult =
  | {
      kind: 'CREATED' | 'RESUMED';
      attempt: CreatedAttemptRecord;
    }
  | {
      kind: 'MAX_ATTEMPTS_REACHED';
      attempt: null;
    };

export interface CreatedAttemptRecord {
  id: string;
  assessmentId: string;
  learnerId: string;

  attemptNumber: number;
  status: AssessmentAttemptStatus;

  score: number | null;
  maxScore: number | null;
  passed: boolean;

  startedAt: Date;
  submittedAt: Date | null;
}

export interface ActiveAttemptAssessmentRecord {
  id: string;
  courseId: string;

  title: string;
  description: string | null;

  type: AssessmentType;
  status: AssessmentStatus;

  totalPoints: number;
  passingScore: number | null;
  timeLimitMinutes: number | null;

  availableFrom: Date | null;
  availableUntil: Date | null;

  isActive: boolean;
  deletedAt: Date | null;
}

export interface ActiveAttemptQuestionRecord {
  id: string;
  questionText: string;
  type: AssessmentQuestionType;
  points: number;
  order: number;

  isActive: boolean;
  deletedAt: Date | null;

  /**
   * Optional answer key record.
   *
   * Service may use this to build safe options for MULTIPLE_CHOICE,
   * but must never expose correctOptionAnswer/correctTextAnswer directly.
   */
  answer?: {
    correctOptionAnswer: string | null;
    correctTextAnswer: string | null;
    wrongAnswers: unknown;
  } | null;
}

export interface ActiveAttemptSavedAnswerRecord {
  questionId: string;
  textAnswer: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ActiveAttemptDetailRecord {
  id: string;
  assessmentId: string;
  learnerId: string;

  attemptNumber: number;
  status: AssessmentAttemptStatus;

  score: number | null;
  maxScore: number | null;
  passed: boolean;

  startedAt: Date;
  submittedAt: Date | null;

  assessment: ActiveAttemptAssessmentRecord;
  questions: ActiveAttemptQuestionRecord[];
  savedAnswers: ActiveAttemptSavedAnswerRecord[];
}

export interface SaveAnswerAttemptContextRecord {
  id: string;
  assessmentId: string;
  learnerId: string;

  status: AssessmentAttemptStatus;
  startedAt: Date;

  assessment: {
    id: string;
    courseId: string;
    type: AssessmentType;
    status: AssessmentStatus;
    isActive: boolean;
    deletedAt: Date | null;
    timeLimitMinutes: number | null;

    availableFrom: Date | null;
    availableUntil: Date | null;
  };

  question: {
    id: string;
    assessmentId: string;
    type: AssessmentQuestionType;
    isActive: boolean;
    deletedAt: Date | null;

    answer?: {
      correctOptionAnswer: string | null;
      correctTextAnswer: string | null;
      wrongAnswers: unknown;
    } | null;
  } | null;
}

export interface SavedAttemptAnswerRecord {
  attemptId: string;
  questionId: string;
  textAnswer: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubmitQuizAttemptQuestionRecord {
  id: string;
  questionText: string;
  type: AssessmentQuestionType;
  explanation: string | null;

  points: number;
  order: number;

  isActive: boolean;
  deletedAt: Date | null;

  answer: {
    correctOptionAnswer: string | null;
    correctTextAnswer: string | null;
    wrongAnswers: unknown;
  } | null;
}

export interface SubmitQuizAttemptAnswerRecord {
  id: string;
  questionId: string;
  textAnswer: string | null;
}

export interface SubmitQuizAttemptRecord {
  id: string;
  assessmentId: string;
  learnerId: string;

  attemptNumber: number;
  status: AssessmentAttemptStatus;

  score: number | null;
  maxScore: number | null;
  passed: boolean;

  startedAt: Date;
  submittedAt: Date | null;

  assessment: {
    id: string;
    courseId: string;

    title: string;
    type: AssessmentType;
    status: AssessmentStatus;

    isActive: boolean;
    deletedAt: Date | null;

    totalPoints: number;
    passingScore: number | null;

    maxAttempts: number | null;
    timeLimitMinutes: number | null;

    availableFrom: Date | null;
    availableUntil: Date | null;

    reviewTiming: string;
    reviewContent: string;
  };

  questions: SubmitQuizAttemptQuestionRecord[];
  savedAnswers: SubmitQuizAttemptAnswerRecord[];
}

export interface GradedAttemptAnswerWrite {
  attemptAnswerId: string;
  isCorrect: boolean;
  pointsEarned: number;
}

export interface SubmitQuizAttemptWriteData {
  attemptId: string;
  status: AssessmentAttemptStatus;
  score: number;
  maxScore: number;
  passed: boolean;
  submittedAt: Date;
  gradedAnswers: GradedAttemptAnswerWrite[];
}

export interface SubmittedAttemptRecord {
  id: string;
  assessmentId: string;
  learnerId: string;

  attemptNumber: number;
  status: AssessmentAttemptStatus;

  score: number | null;
  maxScore: number | null;
  passed: boolean;

  startedAt: Date;
  submittedAt: Date | null;
}
export interface AttemptResultQuestionRecord {
  id: string;
  questionText: string;
  type: AssessmentQuestionType;
  explanation: string | null;
  points: number;
  order: number;

  answer: {
    correctOptionAnswer: string | null;
    correctTextAnswer: string | null;
  } | null;
}

export interface AttemptResultAnswerRecord {
  questionId: string;
  textAnswer: string | null;
  isCorrect: boolean | null;
  pointsEarned: number | null;
}

export interface AttemptResultProjectSubmissionRecord {
  id: string;
  status: ProjectSubmissionStatus;

  githubUrl: string | null;
  deployUrl: string | null;
  documentUrl: string | null;
  note: string | null;

  score: number | null;
  feedback: string | null;

  submittedAt: Date;
  gradedAt: Date | null;
}

export interface AttemptResultRecord {
  id: string;
  assessmentId: string;
  learnerId: string;

  attemptNumber: number;
  status: AssessmentAttemptStatus;

  score: number | null;
  maxScore: number | null;
  passed: boolean;

  startedAt: Date;
  submittedAt: Date | null;

  assessment: {
    id: string;
    courseId: string;
    title: string;
    type: AssessmentType;
    status: AssessmentStatus;
    isActive: boolean;
    deletedAt: Date | null;

    maxAttempts: number | null;
    availableFrom: Date | null;
    availableUntil: Date | null;

    reviewTiming: string;
    reviewContent: string;
  };

  questions: AttemptResultQuestionRecord[];
  answers: AttemptResultAnswerRecord[];

  projectSubmission: AttemptResultProjectSubmissionRecord | null;
}

export interface SubmitProjectAttemptRecord {
  id: string;
  assessmentId: string;
  learnerId: string;

  attemptNumber: number;
  status: AssessmentAttemptStatus;

  startedAt: Date;
  submittedAt: Date | null;

  assessment: {
    id: string;
    courseId: string;
    title: string;
    type: AssessmentType;
    status: AssessmentStatus;
    isActive: boolean;
    deletedAt: Date | null;
    timeLimitMinutes: number | null;

    availableFrom: Date | null;
    availableUntil: Date | null;
  };

  projectSubmission: {
    id: string;
  } | null;
}

export interface SubmitProjectWriteData {
  attemptId: string;
  githubUrl?: string | null;
  deployUrl?: string | null;
  documentUrl?: string | null;
  note?: string | null;
  submittedAt: Date;
}

export interface SubmittedProjectRecord {
  id: string;
  attemptId: string;

  status: ProjectSubmissionStatus;

  githubUrl: string | null;
  deployUrl: string | null;
  documentUrl: string | null;
  note: string | null;

  score: number | null;
  feedback: string | null;

  submittedAt: Date;
  gradedAt: Date | null;
}

export interface IAttemptRepository {
  findPublishedAssessmentsForLearnerCourse(
    courseId: string,
  ): Promise<LearnerCourseAssessmentListRecord[]>;
  findAssessmentForLearnerEntry(
    courseId: string,
    assessmentId: string,
  ): Promise<LearnerAssessmentEntryRecord | null>;

  findLearnerEnrollment(
    courseId: string,
    learnerId: string,
  ): Promise<LearnerEnrollmentRecord | null>;

  findLearnerAttempts(
    assessmentId: string,
    learnerId: string,
  ): Promise<LearnerAttemptSummaryRecord[]>;
  findActiveAttempt(
    assessmentId: string,
    learnerId: string,
  ): Promise<LearnerAttemptSummaryRecord | null>;

  findLatestAttempt(
    assessmentId: string,
    learnerId: string,
  ): Promise<LearnerAttemptSummaryRecord | null>;

  createAttempt(data: CreateAttemptData): Promise<CreatedAttemptRecord>;

  createOrResumeAttemptTransaction(
    data: CreateOrResumeAttemptTransactionData,
  ): Promise<CreateOrResumeAttemptTransactionResult>;

  findActiveAttemptDetail(
    courseId: string,
    assessmentId: string,
    attemptId: string,
    learnerId: string,
  ): Promise<ActiveAttemptDetailRecord | null>;

  findSaveAnswerContext(
    courseId: string,
    assessmentId: string,
    attemptId: string,
    questionId: string,
    learnerId: string,
  ): Promise<SaveAnswerAttemptContextRecord | null>;

  /**
   * If it do not have EXPIRED status yet,
   * mark expired unfinished attempt as FAILED.
   *
   * This prevents multiple IN_PROGRESS attempts.
   */
  markAttemptFailedDueToExpiry(attemptId: string): Promise<void>;

  upsertAttemptAnswer(params: {
    attemptId: string;
    questionId: string;
    textAnswer: string;
  }): Promise<SavedAttemptAnswerRecord | null>;

  findQuizAttemptForSubmit(
    courseId: string,
    assessmentId: string,
    attemptId: string,
    learnerId: string,
  ): Promise<SubmitQuizAttemptRecord | null>;

  submitQuizAttemptTransaction(
    data: SubmitQuizAttemptWriteData,
  ): Promise<SubmittedAttemptRecord | null>;

  countLearnerAttempts(
    assessmentId: string,
    learnerId: string,
  ): Promise<number>;

  findAttemptResult(
    courseId: string,
    assessmentId: string,
    attemptId: string,
    learnerId: string,
  ): Promise<AttemptResultRecord | null>;

  countLearnerAttempts(
    assessmentId: string,
    learnerId: string,
  ): Promise<number>;

  findActiveAttempt(
    assessmentId: string,
    learnerId: string,
  ): Promise<LearnerAttemptSummaryRecord | null>;

  findProjectAttemptForSubmit(
    courseId: string,
    assessmentId: string,
    attemptId: string,
    learnerId: string,
  ): Promise<SubmitProjectAttemptRecord | null>;

  submitProjectTransaction(
    data: SubmitProjectWriteData,
  ): Promise<SubmittedProjectRecord | null>;
}
