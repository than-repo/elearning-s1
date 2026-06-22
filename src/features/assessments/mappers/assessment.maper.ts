import { Prisma } from 'generated/prisma/client';
import {
  Assessment,
  AssessmentStatus,
  AssessmentType,
} from '../interfaces/assessment.repository.interface';

export class AssessmentMapper {
  static toAssessment(assessmentPrisma: Prisma.AssessmentModel): Assessment {
    return {
      id: assessmentPrisma.id,
      courseId: assessmentPrisma.courseId,

      title: assessmentPrisma.title,
      description: assessmentPrisma.description,

      type: this.toAssessmentType(assessmentPrisma.type),
      status: this.toAssessmentStatus(assessmentPrisma.status),

      order: assessmentPrisma.order,

      totalPoints: assessmentPrisma.totalPoints,
      passingScore: assessmentPrisma.passingScore,

      maxAttempts: assessmentPrisma.maxAttempts,
      timeLimitMinutes: assessmentPrisma.timeLimitMinutes,

      availableFrom: assessmentPrisma.availableFrom,
      availableUntil: assessmentPrisma.availableUntil,

      isActive: assessmentPrisma.isActive,

      createdAt: assessmentPrisma.createdAt,
      updatedAt: assessmentPrisma.updatedAt,
      deletedAt: assessmentPrisma.deletedAt,
    };
  }

  static toAssessments(
    assessmentsPrisma: Prisma.AssessmentModel[],
  ): Assessment[] {
    return assessmentsPrisma.map((assessmentPrisma) =>
      this.toAssessment(assessmentPrisma),
    );
  }

  static toAssessmentType(type: string): AssessmentType {
    switch (type) {
      case AssessmentType.QUIZ:
        return AssessmentType.QUIZ;

      case AssessmentType.PROJECT:
        return AssessmentType.PROJECT;

      default:
        throw new Error(`Unsupported assessment type: ${type}`);
    }
  }

  static toAssessmentStatus(status: string): AssessmentStatus {
    switch (status) {
      case AssessmentStatus.DRAFT:
        return AssessmentStatus.DRAFT;

      case AssessmentStatus.PUBLISHED:
        return AssessmentStatus.PUBLISHED;

      case AssessmentStatus.ARCHIVED:
        return AssessmentStatus.ARCHIVED;

      default:
        throw new Error(`Unsupported assessment status: ${status}`);
    }
  }

  static to;
}
