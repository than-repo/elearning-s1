// src/features/courses/dtos/course/instructor-course-review.dto.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { CourseReviewStatus, CourseStatus } from 'generated/prisma/enums';

export class InstructorCourseLatestReviewResponseDto {
  @ApiProperty()
  @Expose()
  reviewId!: string;

  @ApiProperty()
  @Expose()
  courseId!: string;

  @ApiProperty({ enum: CourseStatus })
  @Expose()
  courseStatus!: CourseStatus;

  @ApiProperty({ enum: CourseReviewStatus })
  @Expose()
  reviewStatus!: CourseReviewStatus;

  @ApiPropertyOptional({
    nullable: true,
    example: 'Please improve lesson 2 audio quality before resubmitting.',
  })
  @Expose()
  reviewNote?: string | null;

  @ApiProperty()
  @Expose()
  submittedAt!: Date;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  reviewedAt?: Date | null;
}
