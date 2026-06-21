// src/features/assessments/dtos/assessment-question-response.dto.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { AssessmentQuestionType } from 'generated/prisma/enums';
import { ASSESSMENT_VIEW_GROUPS } from '../assessment-response';

const ALL_ASSESSMENT_GROUPS = [
  ASSESSMENT_VIEW_GROUPS.LEARNER,
  ASSESSMENT_VIEW_GROUPS.INSTRUCTOR,
];

const INSTRUCTOR_ASSESSMENT_GROUPS = [ASSESSMENT_VIEW_GROUPS.INSTRUCTOR];

export class AssessmentQuestionResponseDto {
  @ApiProperty()
  @Expose({ groups: ALL_ASSESSMENT_GROUPS })
  id!: string;

  @ApiProperty()
  @Expose({ groups: INSTRUCTOR_ASSESSMENT_GROUPS })
  assessmentId!: string;

  @ApiProperty()
  @Expose({ groups: ALL_ASSESSMENT_GROUPS })
  questionText!: string;

  @ApiProperty({ enum: AssessmentQuestionType })
  @Expose({ groups: ALL_ASSESSMENT_GROUPS })
  type!: AssessmentQuestionType;

  @ApiPropertyOptional({ nullable: true })
  @Expose({ groups: ALL_ASSESSMENT_GROUPS })
  explanation?: string | null;

  @ApiProperty()
  @Expose({ groups: ALL_ASSESSMENT_GROUPS })
  points!: number;

  @ApiProperty()
  @Expose({ groups: ALL_ASSESSMENT_GROUPS })
  order!: number;

  @ApiProperty()
  @Expose({ groups: INSTRUCTOR_ASSESSMENT_GROUPS })
  isActive!: boolean;

  @ApiProperty({
    type: String,
    format: 'date-time',
  })
  @Expose({ groups: INSTRUCTOR_ASSESSMENT_GROUPS })
  createdAt!: Date;

  @ApiProperty({
    type: String,
    format: 'date-time',
  })
  @Expose({ groups: INSTRUCTOR_ASSESSMENT_GROUPS })
  updatedAt!: Date;

  @ApiPropertyOptional({
    nullable: true,
    type: String,
    format: 'date-time',
  })
  @Expose({ groups: INSTRUCTOR_ASSESSMENT_GROUPS })
  deletedAt?: Date | null;
}
