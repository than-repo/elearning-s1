// src/features/assessments/interfaces/learner-assessment-service-input.interface.ts

import { SaveAttemptAnswerDto } from '../dtos/attempts/save-attempt-answer.dto';
import { SubmitProjectDto } from '../dtos/attempts/submit-project.dto';

export interface GetLearnerCourseAssessmentsInput {
  courseId: string;
  learnerId: string;
}

export interface GetLearnerAssessmentInput {
  courseId: string;
  assessmentId: string;
  learnerId: string;
}

export interface CreateOrResumeAttemptInput {
  courseId: string;
  assessmentId: string;
  learnerId: string;
}

export interface GetActiveAttemptInput {
  courseId: string;
  assessmentId: string;
  attemptId: string;
  learnerId: string;
}

export interface SaveAttemptAnswerInput {
  courseId: string;
  assessmentId: string;
  attemptId: string;
  questionId: string;
  learnerId: string;
  dto: SaveAttemptAnswerDto;
}

export interface SubmitAttemptInput {
  courseId: string;
  assessmentId: string;
  attemptId: string;
  learnerId: string;
}

export interface GetAttemptHistoryInput {
  courseId: string;
  assessmentId: string;
  learnerId: string;
}

export interface GetAttemptResultInput {
  courseId: string;
  assessmentId: string;
  attemptId: string;
  learnerId: string;
}

export interface SubmitProjectInput {
  courseId: string;
  assessmentId: string;
  attemptId: string;
  learnerId: string;
  dto: SubmitProjectDto;
}
