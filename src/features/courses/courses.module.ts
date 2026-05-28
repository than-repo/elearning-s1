import { Module } from '@nestjs/common';
import { CoursesRepository } from './repositories/courses.repository';

import { PrismaService } from 'src/core/database/prisma.service';
import { PrismaModule } from 'src/core/database/prisma.module';
import { CategoryRepository } from './repositories/category.repository';
import { CATEGORY_REPOSITORY } from './repositories/category-repository.token';
import { CategoriesService } from './services/categories.service';
import { CategoriesController } from './controllers/categories.controller';

@Module({
  providers: [
    CoursesRepository,
    CategoriesService,
    PrismaService,
    {
      provide: CATEGORY_REPOSITORY,
      useClass: CategoryRepository,
    },
  ],
  exports: [],
  imports: [PrismaModule],
  controllers: [CategoriesController],
})
export class CoursesModule {}
