import { Module } from '@nestjs/common';
import { CourseRepository } from './repositories/course.repository';

import { PrismaService } from 'src/core/database/prisma.service';
import { PrismaModule } from 'src/core/database/prisma.module';
import { CategoryRepository } from './repositories/category.repository';
import { CATEGORY_REPOSITORY } from './repositories/category-repository.token';
import { CategoriesService } from './services/categories.service';
import { CategoriesController } from './controllers/categories.controller';
import { COURSE_REPOSITORY } from './repositories/course-repository.token';
import { CoursesService } from './services/courses.service';
import { COURSE_SECTION_REPOSITORY } from './repositories/course-section-repository.token';
import { CourseSectionRepository } from './repositories/course-section-repository';
import { FILE_MEDIA_REPOSITORY } from './repositories/file-media.repository.token';
import { FileMediaRepository } from './repositories/file-media.repository';
import { LESSON_REPOSITORY } from './repositories/lesson-repository.token';
import { LessonRepository } from './repositories/lesson.repository';
import { LessonsService } from './services/lessons.service';
import { FileMediaService } from './services/file-media.service';
import { CourseSectionsService } from './services/course-sections.service';

@Module({
  providers: [
    PrismaService,

    //Category
    CategoriesService,
    {
      provide: CATEGORY_REPOSITORY,
      useClass: CategoryRepository,
    },

    //Course
    {
      provide: COURSE_REPOSITORY,
      useClass: CourseRepository,
    },
    CoursesService,

    //SectionCourse
    {
      provide: COURSE_SECTION_REPOSITORY,
      useClass: CourseSectionRepository,
    },
    CourseSectionsService,

    //Lesson
    {
      provide: LESSON_REPOSITORY,
      useClass: LessonRepository,
    },
    LessonsService,

    //FileMedia
    {
      provide: FILE_MEDIA_REPOSITORY,
      useClass: FileMediaRepository,
    },
    FileMediaService,
  ],
  exports: [],
  imports: [PrismaModule],
  controllers: [CategoriesController],
})
export class CoursesModule {}
