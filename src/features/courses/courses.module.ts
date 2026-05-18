import { Module } from '@nestjs/common';
import { CoursesRepository } from './repositories/courses.repository';
import { CoursesService } from './services/courses.service';
import { CoursesController } from './controllers/courses.controller';
import { PrismaService } from 'src/core/database/prisma.service';
import { PrismaModule } from 'src/core/database/prisma.module';

@Module({
  providers: [CoursesRepository, CoursesService, PrismaService],
  exports: [],
  imports: [PrismaModule],
  controllers: [CoursesController],
})
export class CoursesModule {}
