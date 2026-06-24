import { Expose } from 'class-transformer';
import {
  AssessmentReviewContent,
  AssessmentReviewTiming,
} from 'generated/prisma/enums';
import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import {
  ASSESSMENT_VIEW_GROUPS,
  AssessmentResponseDto,
} from './assessment-response';

export class UpdatedPublishedAssessmentResponseDto extends AssessmentResponseDto {
  @ApiProperty({ enum: AssessmentReviewTiming })
  @IsEnum(AssessmentReviewTiming)
  @Expose({
    name: 'assessmentReviewTiming',
    groups: [ASSESSMENT_VIEW_GROUPS.INSTRUCTOR],
  })
  reviewTiming?: AssessmentReviewTiming;

  @ApiProperty({ enum: AssessmentReviewContent })
  @IsEnum(AssessmentReviewContent)
  @Expose({
    name: 'assessmentReviewContent',
    groups: [ASSESSMENT_VIEW_GROUPS.INSTRUCTOR],
  })
  reviewContent?: AssessmentReviewContent;
}
