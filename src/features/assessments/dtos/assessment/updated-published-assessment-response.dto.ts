import {
  AssessmentReviewContent,
  AssessmentReviewTiming,
} from 'generated/prisma/enums';
import { AssessmentResponseDto } from './assessment-response';
import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatedPublishedAssessmentResponseDto extends AssessmentResponseDto {
  @ApiProperty()
  @IsEnum(AssessmentReviewTiming)
  reviewTiming?: AssessmentReviewTiming;

  @ApiProperty()
  @IsEnum(AssessmentReviewContent)
  reviewContent?: AssessmentReviewContent;
}
