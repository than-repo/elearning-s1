import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { CourseReviewStatus } from 'generated/prisma/enums';
import { PaginationMetaDto } from '../paginated-response.dto';
import { CourseResponseDto } from './course-response.dto';

export class ReviewerCourseResponseDto {
  @ApiProperty({
    example: '7c0a2ad5-bdb7-4c1f-8f3e-4183a248d842',
  })
  @Expose()
  reviewId!: string;

  @ApiProperty({
    enum: CourseReviewStatus,
    example: CourseReviewStatus.PENDING,
  })
  @Expose()
  reviewStatus!: CourseReviewStatus;

  @ApiPropertyOptional({
    example: 'Please improve the introduction section.',
    nullable: true,
  })
  @Expose()
  reviewNote?: string | null;

  @ApiProperty({
    example: '2026-06-10T07:15:35.261Z',
  })
  @Expose()
  submittedAt!: Date;

  @ApiPropertyOptional({
    example: null,
    nullable: true,
  })
  @Expose()
  reviewedAt?: Date | null;

  @ApiProperty({
    type: () => CourseResponseDto,
  })
  @Expose()
  @Type(() => CourseResponseDto)
  course!: CourseResponseDto;
}

export class PaginatedReviewerCourseResponseDto {
  @ApiProperty({
    type: () => [ReviewerCourseResponseDto],
  })
  data!: ReviewerCourseResponseDto[];

  @ApiProperty({
    type: () => PaginationMetaDto,
  })
  meta!: PaginationMetaDto;
}
