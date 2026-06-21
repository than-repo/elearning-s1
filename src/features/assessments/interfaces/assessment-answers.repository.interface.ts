// src/features/assessments/interfaces/assessment-answers.repository.interface.ts

export interface IAssessmentAnswerRepository {
  createAnswer(input: CreateAssessmentAnswerInput): Promise<AssessmentAnswer>;

  upsertAnswerByQuestionId(
    questionId: string,
    input: UpsertAssessmentAnswerInput,
  ): Promise<AssessmentAnswer>;

  findAnswerById(answerId: string): Promise<AssessmentAnswer | null>;

  findAnswerByQuestionId(questionId: string): Promise<AssessmentAnswer | null>;

  findManyByQuestionIds(questionIds: string[]): Promise<AssessmentAnswer[]>;

  updateAnswer(
    answerId: string,
    input: UpdateAssessmentAnswerInput,
  ): Promise<AssessmentAnswer>;

  deleteAnswerById(answerId: string): Promise<boolean>;

  deleteAnswerByQuestionId(questionId: string): Promise<boolean>;
}

export interface CreateAssessmentAnswerInput {
  questionId: string;

  correctOptionAnswer?: string | null;
  correctTextAnswer?: string | null;

  wrongAnswers?: AssessmentWrongAnswers | null;
}

export interface UpsertAssessmentAnswerInput {
  correctOptionAnswer?: string | null;
  correctTextAnswer?: string | null;

  wrongAnswers?: AssessmentWrongAnswers | null;
}

export interface UpdateAssessmentAnswerInput {
  correctOptionAnswer?: string | null;
  correctTextAnswer?: string | null;

  wrongAnswers?: AssessmentWrongAnswers | null;
}

export type AssessmentWrongAnswers = string[];

export interface AssessmentAnswer {
  id: string;

  questionId: string;

  correctOptionAnswer: string | null;
  correctTextAnswer: string | null;

  wrongAnswers: AssessmentWrongAnswers | null;

  createdAt: Date;
  updatedAt: Date;
}
