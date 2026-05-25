import { Module } from '@nestjs/common';
import { CoursesRepository } from './repositories/courses.repository';
import { CoursesService } from './services/courses.service';
import { CoursesController } from './controllers/courses.controller';
import { PrismaService } from 'src/core/database/prisma.service';
import { PrismaModule } from 'src/core/database/prisma.module';
import { CategoryRepository } from './repositories/category.repository';
import { CATEGORY_REPOSITORY } from './repositories/category-repository.token';

@Module({
  providers: [
    CoursesRepository,
    CoursesService,
    PrismaService,
    {
      provide: CATEGORY_REPOSITORY,
      useClass: CategoryRepository,
    },
  ],
  exports: [],
  imports: [PrismaModule],
  controllers: [CoursesController],
})
export class CoursesModule {}
