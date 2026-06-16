import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LEARNING_COURSE_REPOSITORY } from '../repositories/learning-course.repository.token';

import { EnrollmentsService } from '../../enrollments/services/enrollments.service';
import type {
  CourseForLearningModel,
  ILearningCourseRepository,
} from '../interfaces/learning-course.repository.interface';
import { plainToInstance } from 'class-transformer';
import { CourseLearningResponseDto } from '../dtos/course-learner-response.dto';

@Injectable()
export class LearningCoursesService {
  constructor(
    @Inject(LEARNING_COURSE_REPOSITORY)
    private readonly iLearningCourseRepository: ILearningCourseRepository,

    private readonly enrollmentsService: EnrollmentsService,
  ) {}

  async getCourseForLearning(
    learnerId: string,
    courseId: string,
  ): Promise<CourseLearningResponseDto> {
    const canLearn: boolean = await this.enrollmentsService.hasActiveEnrollment(
      learnerId,
      courseId,
    );

    if (!canLearn) {
      throw new ForbiddenException('YOU_ARE_NOT_ENROLLED_IN_THIS_COURSE');
    }

    //get detail
    const detailedCourse: CourseForLearningModel | null =
      await this.iLearningCourseRepository.findCourseForLearning(courseId);

    if (!detailedCourse) {
      throw new NotFoundException('Course not found');
    }

    return plainToInstance(CourseLearningResponseDto, detailedCourse, {
      excludeExtraneousValues: true,
    });
  }
}
