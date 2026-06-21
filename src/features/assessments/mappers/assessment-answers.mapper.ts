import { Prisma } from 'generated/prisma/client';
import { AssessmentAnswer } from '../interfaces/assessment-answers.repository.interface';

export class AssessmentAnswersMapper {
  static toAssessmentAnswer(
    answer: Prisma.AssessmentAnswerModel,
  ): AssessmentAnswer {
    return {
      id: answer.id,
      questionId: answer.questionId,
      correctOptionAnswer: answer.correctOptionAnswer,
      correctTextAnswer: answer.correctTextAnswer,
      wrongAnswers: this.toWrongAnswers(answer.wrongAnswers),
      createdAt: answer.createdAt,
      updatedAt: answer.updatedAt,
    };
  }

  static toWrongAnswers(value: Prisma.JsonValue | null): string[] | null {
    if (!Array.isArray(value)) {
      return null;
    }

    return value.filter((item): item is string => typeof item === 'string');
  }
}
