import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/core/database/prisma.service';
import { IAssessmentAccessRepository } from '../interfaces/assessment-access.repository.interface';

@Injectable()
export class AssessmentAccessRepository implements IAssessmentAccessRepository {
  constructor(private readonly prisma: PrismaService) {}

  async existsCourseByInstructor(
    courseId: string,
    instructorId: string,
  ): Promise<boolean> {
    const course = await this.prisma.course.findFirst({
      where: {
        id: courseId,
        isActive: true,
        deletedAt: null,
        instructors: {
          some: {
            instructorId,
            isActive: true,
            deletedAt: null,
          },
        },
      },
      select: {
        id: true,
      },
    });

    return !!course;
  }

  async existsAssessmentInCourse(
    assessmentId: string,
    courseId: string,
  ): Promise<boolean> {
    const assessment = await this.prisma.assessment.findFirst({
      where: {
        id: assessmentId,
        courseId,

        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    return !!assessment;
  }

  async existsQuestionInAssessment(
    questionId: string,
    assessmentId: string,
  ): Promise<boolean> {
    const question = await this.prisma.assessmentQuestion.findFirst({
      where: {
        id: questionId,
        assessmentId,

        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    return !!question;
  }

  async existsAnswerInQuestion(
    answerId: string,
    questionId: string,
  ): Promise<boolean> {
    const answer = await this.prisma.assessmentAnswer.findFirst({
      where: {
        id: answerId,
        questionId,
      },
      select: {
        id: true,
      },
    });

    return !!answer;
  }
}
