import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { Expose } from 'class-transformer';
import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  CourseLevel,
  CourseReviewStatus,
  CourseStatus,
  MediaTypeEnum,
} from 'generated/prisma/enums';

const REVIEW_DECISION_STATUSES = [
  CourseReviewStatus.APPROVED,
  CourseReviewStatus.CHANGES_REQUESTED,
  CourseReviewStatus.REJECTED,
] as const;

export type ReviewDecisionStatus = (typeof REVIEW_DECISION_STATUSES)[number];

export class SubmitCourseReviewDecisionDto {
  @ApiProperty({
    enum: REVIEW_DECISION_STATUSES,
    example: CourseReviewStatus.CHANGES_REQUESTED,
  })
  @IsIn([...REVIEW_DECISION_STATUSES])
  status!: ReviewDecisionStatus;

  @ApiPropertyOptional({
    example: 'Please improve lesson 2 audio quality before publication.',
    maxLength: 10000,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  reviewNote?: string | null;
}

export class ReviewerCourseReviewFileMediaDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  lessonId!: string;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  cloudinaryPublicId?: string | null;

  @ApiProperty()
  @Expose()
  url!: string;

  @ApiProperty({ enum: MediaTypeEnum })
  @Expose()
  type!: MediaTypeEnum;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  filename?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  mimeType?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  sizeInBytes?: number | null;

  @ApiProperty()
  @Expose()
  createdAt!: Date;

  @ApiProperty()
  @Expose()
  updatedAt!: Date;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  deletedAt?: Date | null;
}

export class ReviewerCourseReviewLessonDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  sectionId!: string;

  @ApiProperty()
  @Expose()
  title!: string;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  description?: string | null;

  @ApiProperty()
  @Expose()
  lessonIndex!: number;

  @ApiProperty()
  @Expose()
  isActive!: boolean;

  @ApiProperty()
  @Expose()
  createdAt!: Date;

  @ApiProperty()
  @Expose()
  updatedAt!: Date;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  deletedAt?: Date | null;

  @ApiProperty({ type: () => [ReviewerCourseReviewFileMediaDto] })
  @Expose()
  @Type(() => ReviewerCourseReviewFileMediaDto)
  files!: ReviewerCourseReviewFileMediaDto[];
}

export class ReviewerCourseReviewSectionDto {
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
  description?: string | null;

  @ApiProperty()
  @Expose()
  sectionIndex!: number;

  @ApiProperty()
  @Expose()
  isActive!: boolean;

  @ApiProperty()
  @Expose()
  createdAt!: Date;

  @ApiProperty()
  @Expose()
  updatedAt!: Date;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  deletedAt?: Date | null;

  @ApiProperty({ type: () => [ReviewerCourseReviewLessonDto] })
  @Expose()
  @Type(() => ReviewerCourseReviewLessonDto)
  lessons!: ReviewerCourseReviewLessonDto[];
}

export class ReviewerCourseReviewCategoryDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  name!: string;

  @ApiProperty()
  @Expose()
  slug!: string;
}

export class ReviewerCourseReviewInstructorDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  fullName!: string;
}

export class ReviewerCourseReviewCourseDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  title!: string;

  @ApiProperty()
  @Expose()
  slug!: string;

  @ApiProperty()
  @Expose()
  shortDescription!: string;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  description?: string | null;

  @ApiPropertyOptional({ type: [String], nullable: true })
  @Expose()
  whatYouWillLearn?: string[] | null;

  @ApiPropertyOptional({ type: [String], nullable: true })
  @Expose()
  requirements?: string[] | null;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  thumbnailUrl?: string | null;

  @ApiProperty({ enum: CourseLevel })
  @Expose()
  level!: CourseLevel;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  price?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  language?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  durationInMinutes?: number | null;

  @ApiProperty()
  @Expose()
  certificateEnabled!: boolean;

  @ApiProperty({ enum: CourseStatus })
  @Expose()
  status!: CourseStatus;

  @ApiProperty()
  @Expose()
  isActive!: boolean;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  publishedAt?: Date | null;

  @ApiProperty()
  @Expose()
  createdAt!: Date;

  @ApiProperty()
  @Expose()
  updatedAt!: Date;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  deletedAt?: Date | null;

  @ApiProperty({ type: () => [ReviewerCourseReviewCategoryDto] })
  @Expose()
  @Type(() => ReviewerCourseReviewCategoryDto)
  categories!: ReviewerCourseReviewCategoryDto[];

  @ApiProperty({ type: () => [ReviewerCourseReviewInstructorDto] })
  @Expose()
  @Type(() => ReviewerCourseReviewInstructorDto)
  instructors!: ReviewerCourseReviewInstructorDto[];

  @ApiProperty({ type: () => [ReviewerCourseReviewSectionDto] })
  @Expose()
  @Type(() => ReviewerCourseReviewSectionDto)
  sections!: ReviewerCourseReviewSectionDto[];
}

export class ReviewerCourseReviewWorkspaceResponseDto {
  @ApiProperty()
  @Expose()
  reviewId!: string;

  @ApiProperty({ enum: CourseReviewStatus })
  @Expose()
  reviewStatus!: CourseReviewStatus;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  reviewNote?: string | null;

  @ApiProperty()
  @Expose()
  submittedAt!: Date;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  reviewedAt?: Date | null;

  @ApiProperty({ type: () => ReviewerCourseReviewCourseDto })
  @Expose()
  @Type(() => ReviewerCourseReviewCourseDto)
  course!: ReviewerCourseReviewCourseDto;
}

export class ClaimCourseReviewCourseDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty({ enum: CourseStatus })
  @Expose()
  status!: CourseStatus;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  reviewClaimedById?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  reviewClaimedAt?: Date | null;
}

export class ClaimCourseReviewResponseDto {
  @ApiProperty()
  @Expose()
  reviewId!: string;

  @ApiProperty({ enum: CourseReviewStatus })
  @Expose()
  reviewStatus!: CourseReviewStatus;

  @ApiProperty()
  @Expose()
  submittedAt!: Date;

  @ApiProperty({ type: () => ClaimCourseReviewCourseDto })
  @Expose()
  @Type(() => ClaimCourseReviewCourseDto)
  course!: ClaimCourseReviewCourseDto;
}

export class ReviewerCourseReviewDecisionCourseDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty({ enum: CourseStatus })
  @Expose()
  status!: CourseStatus;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  publishedAt?: Date | null;

  @ApiProperty()
  @Expose()
  updatedAt!: Date;
}

export class ReviewerCourseReviewDecisionResponseDto {
  @ApiProperty()
  @Expose()
  reviewId!: string;

  @ApiProperty({ enum: CourseReviewStatus })
  @Expose()
  reviewStatus!: CourseReviewStatus;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  reviewNote?: string | null;

  @ApiProperty()
  @Expose()
  submittedAt!: Date;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  reviewedAt?: Date | null;

  @ApiProperty({ type: () => ReviewerCourseReviewDecisionCourseDto })
  @Expose()
  @Type(() => ReviewerCourseReviewDecisionCourseDto)
  course!: ReviewerCourseReviewDecisionCourseDto;
}
