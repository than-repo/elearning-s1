import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { DomainJsonValue } from '../../interfaces/detailed-assessment.interface';
import { AssessmentQuestionType } from '../../interfaces/assessment-questions.repository.interface';
import {
  AssessmentStatus,
  AssessmentType,
} from '../../interfaces/assessment.repository.interface';
import {
  AssessmentReviewContent,
  AssessmentReviewTiming,
} from 'generated/prisma/enums';
import { IsEnum } from 'class-validator';

export class DetailedAssessmentAnswerDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  questionId!: string;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  correctOptionAnswer!: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  correctTextAnswer!: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  wrongAnswers!: DomainJsonValue | null;

  @ApiProperty()
  @Expose()
  createdAt!: Date;

  @ApiProperty()
  @Expose()
  updatedAt!: Date;
}

export class DetailedAssessmentQuestionDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  assessmentId!: string;

  @ApiProperty()
  @Expose()
  questionText!: string;

  @ApiProperty({
    enum: AssessmentQuestionType,
    enumName: 'AssessmentQuestionType',
  })
  @Expose()
  type!: AssessmentQuestionType;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  explanation!: string | null;

  @ApiProperty()
  @Expose()
  points!: number;

  @ApiProperty()
  @Expose()
  order!: number;

  @ApiProperty()
  @Expose()
  isActive!: boolean;

  @ApiPropertyOptional({
    type: DetailedAssessmentAnswerDto,
    nullable: true,
  })
  @Expose()
  @Type(() => DetailedAssessmentAnswerDto)
  answer!: DetailedAssessmentAnswerDto | null;

  @ApiProperty()
  @Expose()
  createdAt!: Date;

  @ApiProperty()
  @Expose()
  updatedAt!: Date;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  deletedAt!: Date | null;
}

export class DetailedAssessmentDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  courseId!: string;

  @ApiProperty()
  @Expose()
  title!: string;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  description!: string | null;

  @ApiProperty({
    enum: AssessmentType,
    enumName: 'AssessmentType',
  })
  @Expose()
  type!: AssessmentType;

  @ApiProperty({
    enum: AssessmentStatus,
    enumName: 'AssessmentStatus',
  })
  @Expose()
  status!: AssessmentStatus;

  @ApiProperty()
  @Expose()
  order!: number;

  @ApiProperty()
  @Expose()
  totalPoints!: number;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  passingScore!: number | null;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  maxAttempts!: number | null;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  timeLimitMinutes!: number | null;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  availableFrom!: Date | null;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  availableUntil!: Date | null;

  @ApiProperty()
  @Expose()
  isActive!: boolean;

  @ApiProperty({
    type: [DetailedAssessmentQuestionDto],
  })
  @Expose()
  @Type(() => DetailedAssessmentQuestionDto)
  questions!: DetailedAssessmentQuestionDto[];

  @ApiProperty({ enum: AssessmentReviewTiming })
  @Expose()
  reviewTiming!: AssessmentReviewTiming;

  @ApiProperty({ enum: AssessmentReviewContent })
  @Expose()
  reviewContent!: AssessmentReviewContent;

  @ApiProperty()
  @Expose()
  createdAt!: Date;

  @ApiProperty()
  @Expose()
  updatedAt!: Date;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  deletedAt!: Date | null;
}
