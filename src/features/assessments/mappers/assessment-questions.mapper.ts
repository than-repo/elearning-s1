import { Prisma } from 'generated/prisma/client';
import { AssessmentQuestion } from '../interfaces/assessment-questions.repository.interface';

export class AssessmentQuestionsMapper {
  static toAssessmentQuestion(
    question: Prisma.AssessmentQuestionModel,
  ): AssessmentQuestion {
    return {
      id: question.id,
      assessmentId: question.assessmentId,
      questionText: question.questionText,
      type: question.type,
      explanation: question.explanation,
      points: question.points,
      order: question.order,
      isActive: question.isActive,
      createdAt: question.createdAt,
      updatedAt: question.updatedAt,
      deletedAt: question.deletedAt,
    };
  }
}
