// src/features/courses/services/reviewer-courses.service.ts

import { Inject, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { CourseReviewStatus } from 'generated/prisma/enums';

import {
  COURSE_VIEW_GROUPS,
  CourseResponseDto,
} from '../dtos/course/course-response.dto';
import { ReviewerCourseQueryDto } from '../dtos/course/reviewer-course-query.dto';
import { PaginatedResponse } from '../dtos/paginated-response.dto';

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
  ): Promise<PaginatedResponse<CourseResponseDto>> {
    const page = this.normalizePage(dto.page);
    const limit = this.normalizeLimit(dto.limit);
    const offset = (page - 1) * limit;

    const search = this.normalizeSearch(dto.search);
    const categoryId = this.normalizeString(dto.categoryId);

    /**
     * "Reviewable" means the reviewer can still take action.
     * Therefore this endpoint should only return PENDING reviews.
     *
     * Approved / rejected / changes-requested reviews should belong to
     * another endpoint, for example: findMyReviewHistory().
     */
    const reviewStatus = CourseReviewStatus.PENDING;

    const sortField = dto.sortField ?? ReviewerCourseSortField.SUBMITTED_AT;

    const sortDirection = dto.sortDirection ?? SortDirection.DESC;

    const [reviewTasks, total] = await Promise.all([
      this.courseReviewRepository.findReviewableCourses({
        reviewerId,
        search,
        level: dto.level,
        status: dto.status,
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
        status: dto.status,
        categoryId,
        reviewStatus,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    const data = plainToInstance(
      CourseResponseDto,
      reviewTasks.map((reviewTask) => reviewTask.course),
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

  private normalizePage(page?: number): number {
    if (!page || Number.isNaN(page) || page < 1) {
      return 1;
    }

    return page;
  }

  private normalizeLimit(limit?: number): number {
    if (!limit || Number.isNaN(limit) || limit < 1) {
      return 10;
    }

    return Math.min(limit, 50);
  }

  private normalizeSearch(search?: string): string | undefined {
    if (!search) {
      return undefined;
    }

    const normalizedSearch = search.trim();

    if (!normalizedSearch) {
      return undefined;
    }

    return normalizedSearch;
  }

  private normalizeString(value?: string): string | undefined {
    if (!value) {
      return undefined;
    }

    const normalizedValue = value.trim();

    if (!normalizedValue) {
      return undefined;
    }

    return normalizedValue;
  }
}
