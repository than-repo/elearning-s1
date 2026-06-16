import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/core/database/prisma.module';
import { LearnerEnrollmentsController } from './controllers/learner-enrollments.controller';
import { ENROLLMENT_REPOSITORY } from './repositories/enrollment-repository.token';
import { EnrollmentRepository } from './repositories/enrollment.repository';
import { EnrollmentsService } from './services/enrollments.service';

@Module({
  imports: [PrismaModule],
  controllers: [LearnerEnrollmentsController],
  providers: [
    EnrollmentsService,
    {
      provide: ENROLLMENT_REPOSITORY,
      useClass: EnrollmentRepository,
    },
  ],
  exports: [EnrollmentsService],
})
export class EnrollmentsModule {}
