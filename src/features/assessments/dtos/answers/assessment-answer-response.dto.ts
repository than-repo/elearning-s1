// src/features/assessments/dtos/answers/assessment-answer-response.dto.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { ASSESSMENT_VIEW_GROUPS } from '../assessment-response';

const INSTRUCTOR_ASSESSMENT_GROUPS = [ASSESSMENT_VIEW_GROUPS.INSTRUCTOR];

export class AssessmentAnswerResponseDto {
  @ApiProperty()
  @Expose({ groups: INSTRUCTOR_ASSESSMENT_GROUPS })
  id!: string;

  @ApiProperty()
  @Expose({ groups: INSTRUCTOR_ASSESSMENT_GROUPS })
  questionId!: string;

  @ApiPropertyOptional({ nullable: true })
  @Expose({ groups: INSTRUCTOR_ASSESSMENT_GROUPS })
  correctOptionAnswer?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Expose({ groups: INSTRUCTOR_ASSESSMENT_GROUPS })
  correctTextAnswer?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    type: [String],
  })
  @Expose({ groups: INSTRUCTOR_ASSESSMENT_GROUPS })
  wrongAnswers?: string[] | null;

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
}
