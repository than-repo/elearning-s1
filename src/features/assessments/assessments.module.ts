import { Controller, Module } from '@nestjs/common';
import { AssessmentsService } from './services/assessments.service';
import { InstructorController } from './controllers/instructor.controller';
import { ASSESSMENT_REPOSITORY } from './repositories/assessment.repository.token';
import { AssessmentRepository } from './repositories/assessment.repository';

import { AssessmentAccessRepository } from './repositories/assessment-access.repository';
import { ASSESSMENT_ACCESS_REPOSITORY } from './services/assessment-access.service';

@Module({
  providers: [
    AssessmentsService,
    {
      provide: ASSESSMENT_REPOSITORY,
      useClass: AssessmentRepository,
    },
    {
      provide: ASSESSMENT_ACCESS_REPOSITORY,
      useClass: AssessmentAccessRepository,
    },
  ],
  imports: [],
  controllers: [InstructorController],
  exports: [],
})
export class AssessmentsModule {}
