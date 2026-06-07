import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { COURSE_REPOSITORY } from '../repositories/course-repository.token';
import type { ICourseRepository } from '../interfaces/course.repository.interface';
import { COURSE_SECTION_REPOSITORY } from '../repositories/course-section-repository.token';
import type { ICourseSectionRepository } from '../interfaces/course-section.repository.interface';
import { LESSON_REPOSITORY } from '../repositories/lesson-repository.token';
import type { ILessonRepository } from '../interfaces/lesson.repository.interface';

@Injectable()
export class CourseAccessService {
  constructor(
    @Inject(COURSE_REPOSITORY)
    private readonly courseRepository: ICourseRepository,

    @Inject(COURSE_SECTION_REPOSITORY)
    private readonly courseSectionRepository: ICourseSectionRepository,

    @Inject(LESSON_REPOSITORY)
    private readonly iLessonRepository: ILessonRepository,
  ) {}

  async ensureInstructorCanManageCourse(
    courseId: string,
    instructorId: string,
  ): Promise<void> {
    const canManage = await this.courseRepository.existsOwnedByInstructor(
      courseId,
      instructorId,
    );

    if (!canManage) {
      throw new NotFoundException('COURSE NOT FOUND');
    }
  }
  async ensureInstructorCanManageSection(
    courseId: string,
    instructorId: string,
    sectionId: string,
  ): Promise<void> {
    await this.ensureInstructorCanManageCourse(courseId, instructorId);
    const canManage = await this.courseSectionRepository.existsInCourse(
      sectionId,
      courseId,
    );
    if (!canManage) {
      throw new NotFoundException('SECTION NOT FOUND');
    }
  }
  async ensureInstructorCanManageLesson(
    courseId: string,
    instructorId: string,
    sectionId: string,
    lessonId: string,
  ): Promise<void> {
    await this.ensureInstructorCanManageSection(
      courseId,
      instructorId,
      sectionId,
    );

    const canManage = await this.iLessonRepository.existsInSection(
      lessonId,
      sectionId,
    );

    if (!canManage) {
      throw new NotFoundException('LESSON NOT FOUND');
    }
  }
}
