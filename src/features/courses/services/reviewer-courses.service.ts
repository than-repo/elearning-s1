// src/features/courses/services/reviewer-courses.service.ts

import { Inject, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { CourseReviewStatus, CourseStatus } from 'generated/prisma/enums';

import {
  COURSE_VIEW_GROUPS,
} from '../dtos/course/course-response.dto';
import { ReviewerCourseQueryDto } from '../dtos/course/reviewer-course-query.dto';
import { PaginatedResponse } from '../dtos/paginated-response.dto';
import { ReviewerCourseResponseDto } from '../dtos/course/reviewer-course-response.dto';

import { COURSE_REVIEW_REPOSITORY } from '../repositories/course-review-repository.token';
import type { ICourseReviewRepository } from '../interfaces/course-review.repository.interface';

import {
  ReviewerCourseSortField,
  SortDirection,
} from '../dtos/course/reviewer-course-query.dto';

@Injectable()
export class ReviewerCoursesService {
  constructor(
    @Inject(COURSE_REVIEW_REPOSITORY)
    private readonly courseReviewRepository: ICourseReviewRepository,
  ) {}

  async findReviewableCourses(
    reviewerId: string,
    dto: ReviewerCourseQueryDto,
  ): Promise<PaginatedResponse<ReviewerCourseResponseDto>> {
    const { search, categoryId } = dto;

    const limit = dto.limit ?? 10;
    const page = dto.page ?? 1;
    const offset = (page - 1) * limit;

    const reviewStatus = dto.reviewStatus ?? CourseReviewStatus.PENDING;

    const courseStatus = dto.status ?? CourseStatus.IN_REVIEW;

    const sortField = dto.sortField ?? ReviewerCourseSortField.SUBMITTED_AT;

    const sortDirection = dto.sortDirection ?? SortDirection.DESC;

    const [reviewTasks, total] = await Promise.all([
      this.courseReviewRepository.findReviewableCourses({
        reviewerId,
        search,
        level: dto.level,
        status: courseStatus,
        categoryId,
        reviewStatus,
        limit,
        offset,
        sortField,
        sortDirection,
      }),

      this.courseReviewRepository.countReviewableCourses({
        reviewerId,
        search,
        level: dto.level,
        status: courseStatus,
        categoryId,
        reviewStatus,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    const data = plainToInstance(
      ReviewerCourseResponseDto,
      reviewTasks,
      {
        excludeExtraneousValues: true,
        groups: [COURSE_VIEW_GROUPS.REVIEWER],
      },
    );

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }
}
