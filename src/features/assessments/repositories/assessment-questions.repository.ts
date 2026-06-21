// src/features/assessments/repositories/assessment-questions.repository.ts

import { Injectable } from '@nestjs/common';
import {
  AssessmentQuestion as PrismaAssessmentQuestion,
  Prisma,
} from 'generated/prisma/client';
import { PrismaService } from 'src/core/database/prisma.service';
import {
  AssessmentQuestion,
  CreateAssessmentQuestionInput,
  IAssessmentQuestionRepository,
  OrderAssessmentQuestionInput,
  UpdateAssessmentQuestionInput,
  WhereAssessmentQuestionInput,
} from '../interfaces/assessment-questions.repository.interface';
import { AssessmentQuestionsMapper } from '../mappers/assessment-questions.mapper';

@Injectable()
export class AssessmentQuestionsRepository implements IAssessmentQuestionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createQuestion(
    input: CreateAssessmentQuestionInput,
  ): Promise<AssessmentQuestion> {
    const question = await this.prisma.assessmentQuestion.create({
      data: {
        assessmentId: input.assessmentId,
        questionText: input.questionText,
        type: input.type,
        explanation: input.explanation ?? null,
        points: input.points ?? 1,
        order: input.order ?? 0,
        isActive: input.isActive ?? true,
      },
    });

    return AssessmentQuestionsMapper.toAssessmentQuestion(question);
  }

  async getNextOrder(assessmentId: string): Promise<number> {
    const result = await this.prisma.assessmentQuestion.aggregate({
      where: {
        assessmentId,
        isActive: true,
        deletedAt: null,
      },
      _max: {
        order: true,
      },
    });

    return result._max.order !== null ? result._max.order + 1 : 0;
  }

  async findQuestionById(
    questionId: string,
  ): Promise<AssessmentQuestion | null> {
    const question = await this.prisma.assessmentQuestion.findFirst({
      where: {
        id: questionId,
        isActive: true,
        deletedAt: null,
      },
    });

    return question
      ? AssessmentQuestionsMapper.toAssessmentQuestion(question)
      : null;
  }

  async findMany(
    where: WhereAssessmentQuestionInput,
    orderBy: OrderAssessmentQuestionInput,
    skip: number,
    take: number,
  ): Promise<AssessmentQuestion[]> {
    const questions = await this.prisma.assessmentQuestion.findMany({
      where: this.buildWhere(where),
      orderBy: [this.buildOrder(orderBy), { createdAt: 'asc' }],
      skip,
      take,
    });

    return questions.map((question) =>
      AssessmentQuestionsMapper.toAssessmentQuestion(question),
    );
  }

  async count(where: WhereAssessmentQuestionInput): Promise<number> {
    return this.prisma.assessmentQuestion.count({
      where: this.buildWhere(where),
    });
  }

  async updateQuestion(
    questionId: string,
    input: UpdateAssessmentQuestionInput,
  ): Promise<AssessmentQuestion> {
    const question = await this.prisma.assessmentQuestion.update({
      where: {
        id: questionId,
      },
      data: {
        questionText: input.questionText,
        type: input.type,
        explanation: input.explanation,
        points: input.points,
        order: input.order,
        isActive: input.isActive,
      },
    });

    return AssessmentQuestionsMapper.toAssessmentQuestion(question);
  }

  async softDeleteQuestion(questionId: string): Promise<boolean> {
    const result = await this.prisma.assessmentQuestion.updateMany({
      where: {
        id: questionId,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    return result.count > 0;
  }

  async countActiveQuestions(assessmentId: string): Promise<number> {
    return this.prisma.assessmentQuestion.count({
      where: {
        assessmentId,
        isActive: true,
        deletedAt: null,
      },
    });
  }

  async sumActiveQuestionPoints(assessmentId: string): Promise<number> {
    const result = await this.prisma.assessmentQuestion.aggregate({
      where: {
        assessmentId,
        isActive: true,
        deletedAt: null,
      },
      _sum: {
        points: true,
      },
    });

    return result._sum.points ?? 0;
  }

  private buildWhere(
    where: WhereAssessmentQuestionInput,
  ): Prisma.AssessmentQuestionWhereInput {
    const wherePrisma: Prisma.AssessmentQuestionWhereInput = {};

    const {
      id,
      ids,
      assessmentId,
      assessmentIds,
      type,
      types,
      isActive,
      includeDeleted,
      search,
      pointsGte,
      pointsLte,
      createdAtGte,
      updatedAtGte,
    } = where;

    if (id) {
      wherePrisma.id = id;
    }

    if (ids?.length) {
      wherePrisma.id = {
        in: ids,
      };
    }

    if (assessmentId) {
      wherePrisma.assessmentId = assessmentId;
    }

    if (assessmentIds?.length) {
      wherePrisma.assessmentId = {
        in: assessmentIds,
      };
    }

    if (type) {
      wherePrisma.type = type;
    }

    if (types?.length) {
      wherePrisma.type = {
        in: types,
      };
    }

    if (isActive !== undefined) {
      wherePrisma.isActive = isActive;
    }

    if (includeDeleted !== true) {
      wherePrisma.deletedAt = null;
    }

    if (search) {
      wherePrisma.OR = [
        {
          questionText: {
            contains: search,
          },
        },
        {
          explanation: {
            contains: search,
          },
        },
      ];
    }

    if (pointsGte !== undefined || pointsLte !== undefined) {
      wherePrisma.points = {
        ...(pointsGte !== undefined ? { gte: pointsGte } : {}),
        ...(pointsLte !== undefined ? { lte: pointsLte } : {}),
      };
    }

    if (createdAtGte) {
      wherePrisma.createdAt = {
        gte: createdAtGte,
      };
    }

    if (updatedAtGte) {
      wherePrisma.updatedAt = {
        gte: updatedAtGte,
      };
    }

    return wherePrisma;
  }

  private buildOrder(
    orderBy: OrderAssessmentQuestionInput,
  ): Prisma.AssessmentQuestionOrderByWithRelationInput {
    return {
      [orderBy.field]: orderBy.direction,
    };
  }
}
