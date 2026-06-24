import { Controller, Module } from '@nestjs/common';
import { AssessmentsService } from './services/assessments.service';
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
import { InstructorAssessmentsController } from './controllers/instructor-assessments.controller';
import { LearnerAssessmentsService } from './services/learner-assessments.service';
import { ATTEMPT_REPOSITORY } from './repositories/attempt.repository.token';
import { AttemptRepository } from './repositories/attempt.repository';
import { LearnerAssessmentsController } from './controllers/learner-assessments.controller';
import { PrismaModule } from 'src/core/database/prisma.module';

@Module({
  providers: [
    AssessmentsService,
    AssessmentAccessService,
    AssessmentAnswersService,
    AssessmentQuestionsService,
    LearnerAssessmentsService,
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
    {
      provide: ATTEMPT_REPOSITORY,
      useClass: AttemptRepository,
    },
  ],
  imports: [PrismaModule],
  controllers: [InstructorAssessmentsController, LearnerAssessmentsController],
  exports: [],
})
export class AssessmentsModule {}
