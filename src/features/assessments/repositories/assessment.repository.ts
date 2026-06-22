import { PrismaService } from 'src/core/database/prisma.service';
import {
  Assessment,
  CreateAssessmentInput,
  IAssessmentRepository,
  OrderAssessmentInput,
  UpdateAssessmentInput,
  UpdatePublishedAssessmentInput,
  WhereAssessmentInput,
} from '../interfaces/assessment.repository.interface';
import { AssessmentMapper } from '../mappers/assessment.maper';
import { Prisma } from 'generated/prisma/client';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class AssessmentRepository implements IAssessmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createDraftAssessment(
    input: CreateAssessmentInput,
  ): Promise<Assessment> {
    const assessment = await this.prisma.assessment.create({
      data: {
        courseId: input.courseId,

        title: input.title,
        description: input.description,
        type: input.type,
        status: input.status,
        order: input.order,

        totalPoints: input.totalPoints,
        passingScore: input.passingScore,

        maxAttempts: input.maxAttempts,
        timeLimitMinutes: input.timeLimitMinutes,

        availableFrom: input.availableFrom,
        availableUntil: input.availableUntil,

        isActive: input.isActive,
      },
    });

    return AssessmentMapper.toAssessment(assessment);
  }

  async getNextOrder(courseId: string): Promise<number> {
    const result = await this.prisma.assessment.aggregate({
      where: { isActive: true, deletedAt: null, courseId },
      _max: { order: true },
    });

    return result._max.order !== null ? result._max.order + 1 : 0;
  }

  async findAssessmentById(assessmentId: string): Promise<Assessment | null> {
    const assessment = await this.prisma.assessment.findFirst({
      where: {
        id: assessmentId,
        isActive: true,
        deletedAt: null,
      },
    });

    return assessment ? AssessmentMapper.toAssessment(assessment) : null;
  }

  async updateDraftAssessment(
    assessmentId: string,
    input: UpdateAssessmentInput,
  ): Promise<Assessment> {
    const assessment = await this.prisma.assessment.update({
      where: { id: assessmentId },
      data: { ...input },
    });

    return AssessmentMapper.toAssessment(assessment);
  }

  async updatePublishAssessment(
    assessmentId: string,
    input: UpdatePublishedAssessmentInput,
  ): Promise<Assessment> {
    const assessment = await this.prisma.assessment.update({
      where: { id: assessmentId },
      data: { ...input },
    });

    return AssessmentMapper.toAssessment(assessment);
  }

  async softDeleteAssessment(assessmentId: string): Promise<boolean> {
    const assessments = await this.prisma.assessment.updateMany({
      where: { id: assessmentId },
      data: { deletedAt: new Date() },
    });

    return assessments.count > 0;
  }

  async findMany(
    where: WhereAssessmentInput,
    orderBy: OrderAssessmentInput,
    skip: number,
    take: number,
  ): Promise<Assessment[]> {
    const assessments = await this.prisma.assessment.findMany({
      where: this.buildWhere(where),
      orderBy: this.buildOrder(orderBy),
      take,
      skip,
    });
    return assessments.map(AssessmentMapper.toAssessment);
  }
  async count(where: WhereAssessmentInput): Promise<number> {
    return this.prisma.assessment.count({
      where: this.buildWhere(where),
    });
  }
  private buildWhere(where: WhereAssessmentInput): Prisma.AssessmentWhereInput {
    const wherePrisma: Prisma.AssessmentWhereInput = {};

    const {
      id,
      ids,
      courseId,
      courseIds,
      type,
      types,
      status,
      statuses,
      isActive,
      includeDeleted,
      search,
      availableFromGte,
      availableUntilLte,
      createdAtGte,
      updatedAtGte,
    } = where;

    if (id) wherePrisma.id = id;
    if (ids) wherePrisma.id = { in: ids };

    if (courseId) wherePrisma.courseId = courseId;
    if (courseIds) wherePrisma.courseId = { in: courseIds };

    if (type) wherePrisma.type = type;
    if (types) wherePrisma.type = { in: types };

    if (status) wherePrisma.status = status;
    if (statuses) wherePrisma.status = { in: statuses };

    if (isActive !== undefined) {
      wherePrisma.isActive = isActive;
    }

    if (includeDeleted !== true) {
      wherePrisma.deletedAt = null;
    }

    if (search) {
      wherePrisma.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }

    if (availableFromGte) {
      wherePrisma.availableFrom = { gte: availableFromGte };
    }

    if (availableUntilLte) {
      wherePrisma.availableUntil = { lte: availableUntilLte };
    }

    if (createdAtGte) {
      wherePrisma.createdAt = { gte: createdAtGte };
    }

    if (updatedAtGte) {
      wherePrisma.updatedAt = { gte: updatedAtGte };
    }

    return wherePrisma;
  }
  private buildOrder(
    orderBy: OrderAssessmentInput,
  ): Prisma.AssessmentOrderByWithAggregationInput {
    const orderByPrisma: Prisma.AssessmentOrderByWithAggregationInput = {};

    const field = orderBy.field;
    const dir = orderBy.direction;
    orderByPrisma[field] = dir;
    return orderByPrisma;
  }
}
