import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { IAssessmentAccessRepository } from '../interfaces/assessment-access.repository.interface';

export const ASSESSMENT_ACCESS_REPOSITORY = 'ASSESSMENT_ACCESS_REPOSITORY';

@Injectable()
export class AssessmentAccessService {
  constructor(
    @Inject(ASSESSMENT_ACCESS_REPOSITORY)
    private readonly assessmentAccessRepository: IAssessmentAccessRepository,
  ) {}

  async ensureInstructorCanManageCourse(
    instructorId: string,
    courseId: string,
  ): Promise<void> {
    const canAccess =
      await this.assessmentAccessRepository.existsCourseByInstructor(
        courseId,
        instructorId,
      );

    if (!canAccess) {
      throw new ForbiddenException('Access denied');
    }
  }

  async ensureInstructorCanManageAssessment(
    instructorId: string,
    courseId: string,
    assessmentId: string,
  ): Promise<void> {
    await this.ensureInstructorCanManageCourse(instructorId, courseId);

    const canAccess =
      await this.assessmentAccessRepository.existsAssessmentInCourse(
        assessmentId,
        courseId,
      );

    if (!canAccess) {
      throw new ForbiddenException('Access denied');
    }
  }

  async ensureInstructorCanManageQuestion(
    instructorId: string,
    courseId: string,
    assessmentId: string,
    questionId: string,
  ): Promise<void> {
    await this.ensureInstructorCanManageAssessment(
      instructorId,
      courseId,
      assessmentId,
    );

    const canAccess =
      await this.assessmentAccessRepository.existsQuestionInAssessment(
        questionId,
        assessmentId,
      );

    if (!canAccess) {
      throw new ForbiddenException('Access denied');
    }
  }

  async ensureInstructorCanManageAnswer(
    instructorId: string,
    courseId: string,
    assessmentId: string,
    questionId: string,
    answerId: string,
  ): Promise<void> {
    await this.ensureInstructorCanManageQuestion(
      instructorId,
      courseId,
      assessmentId,
      questionId,
    );

    const canAccess =
      await this.assessmentAccessRepository.existsAnswerInQuestion(
        answerId,
        questionId,
      );

    if (!canAccess) {
      throw new ForbiddenException('Access denied');
    }
  }
}
