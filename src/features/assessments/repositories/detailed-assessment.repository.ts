import { AssessmentQuestionType, Prisma } from 'generated/prisma/client';
import {
  DetailedAssessment,
  DomainJsonValue,
  IDetailedAssessmentRepository,
} from '../interfaces/detailed-assessment.interface';

import { PrismaService } from 'src/core/database/prisma.service';

import { AssessmentQuestionType as DomainAssessmentQuestionType } from '../interfaces/assessment-questions.repository.interface';
import { Injectable } from '@nestjs/common';

export const detailedAssessmentInclude = {
  questions: {
    include: {
      answers: true,
    },
    orderBy: {
      order: 'asc',
    },
  },
} satisfies Prisma.AssessmentInclude;

export type DetailedAssessmentEntity = Prisma.AssessmentGetPayload<{
  include: typeof detailedAssessmentInclude;
}>;

@Injectable()
export class DetailedAssessmentRepository implements IDetailedAssessmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findDetailedAssessment(
    assessmentId: string,
  ): Promise<DetailedAssessment | null> {
    const detailedAssessment = await this.prisma.assessment.findFirst({
      where: {
        id: assessmentId,
      },
      include: detailedAssessmentInclude,
    });

    return detailedAssessment
      ? this.toDetailedAssessment(detailedAssessment)
      : null;
  }

  private toDetailedAssessment(
    assessmentPrisma: DetailedAssessmentEntity,
  ): DetailedAssessment {
    return {
      id: assessmentPrisma.id,
      courseId: assessmentPrisma.courseId,

      title: assessmentPrisma.title,
      description: assessmentPrisma.description ?? null,

      type: assessmentPrisma.type,
      status: assessmentPrisma.status,

      order: assessmentPrisma.order,

      totalPoints: assessmentPrisma.totalPoints,
      passingScore: assessmentPrisma.passingScore ?? null,

      maxAttempts: assessmentPrisma.maxAttempts ?? null,
      timeLimitMinutes: assessmentPrisma.timeLimitMinutes ?? null,

      availableFrom: assessmentPrisma.availableFrom ?? null,
      availableUntil: assessmentPrisma.availableUntil ?? null,

      isActive: assessmentPrisma.isActive,

      createdAt: assessmentPrisma.createdAt,
      updatedAt: assessmentPrisma.updatedAt,
      deletedAt: assessmentPrisma.deletedAt ?? null,

      questions: assessmentPrisma.questions.map((question) => {
        const answer = question.answers[0] ?? null;

        return {
          id: question.id,
          assessmentId: question.assessmentId,

          questionText: question.questionText,
          type: this.toDomainAssessmentQuestionType(question.type),

          explanation: question.explanation ?? null,

          points: question.points,
          order: question.order,

          isActive: question.isActive,

          createdAt: question.createdAt,
          updatedAt: question.updatedAt,
          deletedAt: question.deletedAt ?? null,

          answer: answer
            ? {
                id: answer.id,
                questionId: answer.questionId,

                correctOptionAnswer: answer.correctOptionAnswer ?? null,
                correctTextAnswer: answer.correctTextAnswer ?? null,

                wrongAnswers: this.toDomainJsonValue(answer.wrongAnswers),

                createdAt: answer.createdAt,
                updatedAt: answer.updatedAt,
              }
            : null,
        };
      }),
    };
  }

  private toDomainAssessmentQuestionType = (
    type: AssessmentQuestionType,
  ): DomainAssessmentQuestionType => {
    switch (type) {
      case AssessmentQuestionType.MULTIPLE_CHOICE:
        return DomainAssessmentQuestionType.MULTIPLE_CHOICE;

      case AssessmentQuestionType.TRUE_FALSE:
        return DomainAssessmentQuestionType.TRUE_FALSE;

      case AssessmentQuestionType.FILL_IN_THE_BLANK:
        return DomainAssessmentQuestionType.FILL_IN_THE_BLANK;

      case AssessmentQuestionType.PROJECT:
        return DomainAssessmentQuestionType.PROJECT;

      default: {
        const exhaustiveCheck: never = type;
        throw new Error(
          `Unsupported assessment question type: ${exhaustiveCheck}`,
        );
      }
    }
  };
  private toDomainJsonValue(
    value: Prisma.JsonValue | null | undefined,
  ): DomainJsonValue | null {
    if (value === null || value === undefined) {
      return null;
    }

    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((item) =>
        this.toDomainJsonValue(item),
      ) as DomainJsonValue[];
    }

    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        this.toDomainJsonValue(item),
      ]),
    );
  }
}
