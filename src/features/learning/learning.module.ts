import { Module } from '@nestjs/common';
import { LearnerCoursesController } from './controllers/learning-courses.controller';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { LearningCoursesService } from './services/learning-courses.service';
import { LearningCourseRepository } from './repositories/learning-course.repository';
import { LEARNING_COURSE_REPOSITORY } from './repositories/learning-course.repository.token';

@Module({
  imports: [EnrollmentsModule],
  exports: [],
  controllers: [LearnerCoursesController],
  providers: [
    LearningCoursesService,
    {
      provide: LEARNING_COURSE_REPOSITORY,
      useClass: LearningCourseRepository,
    },
  ],
})
export class LearningModule {}
