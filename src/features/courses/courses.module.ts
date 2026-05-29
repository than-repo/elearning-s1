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
  ],
  exports: [],
  imports: [PrismaModule],
  controllers: [CategoriesController],
})
export class CoursesModule {}
