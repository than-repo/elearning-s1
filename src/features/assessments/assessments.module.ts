import { Controller, Module } from '@nestjs/common';
import { AssessmentsService } from './services/assessments.service';
import { InstructorController } from './controllers/instructor.controller';
import { ASSESSMENT_REPOSITORY } from './repositories/assessment.repository.token';
import { AssessmentRepository } from './repositories/assessment.repository';

import { AssessmentAccessRepository } from './repositories/assessment-access.repository';
import {
  ASSESSMENT_ACCESS_REPOSITORY,
  AssessmentAccessService,
} from './services/assessment-access.service';
import { AssessmentAnswersService } from './services/assessment-answers.service';
import { AssessmentQuestionsService } from './services/assessment-questions.service';
import { ASSESSMENT_QUESTIONS_REPOSITORY } from './repositories/assessment-questions.interface.token';
import { AssessmentAnswersRepository } from './repositories/assessment-answers.repository';
import { AssessmentQuestionsRepository } from './repositories/assessment-questions.repository';
import { ASSESSMENT_ANSWERS_REPOSITORY } from './repositories/assessment-answers.repository.token';
import { DETAILED_ASSESSMENT_REPOSITORY } from './repositories/detailed-assessment.repository.token';
import { DetailedAssessmentRepository } from './repositories/detailed-assessment.repository';
import { PrismaService } from 'src/core/database/prisma.service';

@Module({
  providers: [
    AssessmentsService,
    AssessmentAccessService,
    AssessmentAnswersService,
    AssessmentQuestionsService,
    {
      provide: ASSESSMENT_REPOSITORY,
      useClass: AssessmentRepository,
    },
    {
      provide: ASSESSMENT_ACCESS_REPOSITORY,
      useClass: AssessmentAccessRepository,
    },
    {
      provide: ASSESSMENT_ANSWERS_REPOSITORY,
      useClass: AssessmentAnswersRepository,
    },
    {
      provide: ASSESSMENT_QUESTIONS_REPOSITORY,
      useClass: AssessmentQuestionsRepository,
    },
    {
      provide: DETAILED_ASSESSMENT_REPOSITORY,
      useClass: DetailedAssessmentRepository,
    },
  ],
  imports: [PrismaService],
  controllers: [InstructorController],
  exports: [],
})
export class AssessmentsModule {}
