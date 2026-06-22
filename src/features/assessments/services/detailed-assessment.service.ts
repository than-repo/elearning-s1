import { Inject, Injectable } from '@nestjs/common';
import type { IDetailedAssessmentRepository } from '../interfaces/detailed-assessment.interface';
import { DETAILED_ASSESSMENT_REPOSITORY } from '../repositories/detailed-assessment.repository.token';

@Injectable()
export class DetailedAssessmentService {
  constructor(
    @Inject(DETAILED_ASSESSMENT_REPOSITORY)
    private readonly iDetailedAssessmentRepository: IDetailedAssessmentRepository,
  ) {}

  async getDetailedAssessment() {}
}
