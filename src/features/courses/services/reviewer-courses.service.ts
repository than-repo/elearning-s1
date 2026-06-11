// src/features/courses/services/reviewer-courses.service.ts

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { CourseReviewStatus, CourseStatus } from 'generated/prisma/enums';

import {
  COURSE_VIEW_GROUPS,
  CourseResponseDto,
} from '../dtos/course/course-response.dto';
import {
  AvailableReviewerCourseQueryDto,
  AvailableReviewerCourseSortField,
  ReviewerCourseQueryDto,
  ReviewerCourseSortField,
  SortDirection,
} from '../dtos/course/reviewer-course-query.dto';
import { PaginatedResponse } from '../dtos/paginated-response.dto';
import { ReviewerCourseResponseDto } from '../dtos/course/reviewer-course-response.dto';
import {
  ClaimCourseReviewResponseDto,
  ReviewerCourseReviewDecisionResponseDto,
  ReviewerCourseReviewWorkspaceResponseDto,
  SubmitCourseReviewDecisionDto,
} from '../dtos/course/reviewer-course-review.dto';

import { COURSE_REVIEW_REPOSITORY } from '../repositories/course-review-repository.token';
import type {
  DecidedCourseReviewStatus,
  ICourseReviewRepository,
  ReviewDecisionCourseStatus,
} from '../interfaces/course-review.repository.interface';

@Injectable()
export class ReviewerCoursesService {
  constructor(
    @Inject(COURSE_REVIEW_REPOSITORY)
    private readonly courseReviewRepository: ICourseReviewRepository,
  ) {}

  async findAvailableCourses(
    reviewerId: string,
    dto: AvailableReviewerCourseQueryDto,
  ): Promise<PaginatedResponse<CourseResponseDto>> {
    const { search, categoryId } = dto;

    const limit = dto.limit ?? 10;
    const page = dto.page ?? 1;
    const offset = (page - 1) * limit;

    const sortField =
      dto.sortField ?? AvailableReviewerCourseSortField.UPDATED_AT;

    const sortDirection = dto.sortDirection ?? SortDirection.DESC;

    const [courses, total] = await Promise.all([
      this.courseReviewRepository.findAvailableCourses({
        reviewerId,
        search,
        level: dto.level,
        categoryId,
        limit,
        offset,
        sortField,
        sortDirection,
      }),

      this.courseReviewRepository.countAvailableCourses({
        reviewerId,
        search,
        level: dto.level,
        categoryId,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    const data = plainToInstance(CourseResponseDto, courses, {
      excludeExtraneousValues: true,
      groups: [COURSE_VIEW_GROUPS.REVIEWER],
    });

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

  async claimCourseForReview(
    reviewerId: string,
    courseId: string,
  ): Promise<ClaimCourseReviewResponseDto> {
    const result = await this.courseReviewRepository.claimCourseForReview(
      reviewerId,
      courseId,
    );

    if (result.status === 'not_found') {
      throw new NotFoundException('COURSE_NOT_AVAILABLE_FOR_REVIEW');
    }

    if (result.status === 'already_claimed') {
      throw new ConflictException('COURSE_ALREADY_CLAIMED_FOR_REVIEW');
    }

    return plainToInstance(ClaimCourseReviewResponseDto, result.data, {
      excludeExtraneousValues: true,
    });
  }

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

    const data = plainToInstance(ReviewerCourseResponseDto, reviewTasks, {
      excludeExtraneousValues: true,
      groups: [COURSE_VIEW_GROUPS.REVIEWER],
    });

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

  async getReviewWorkspace(
    reviewerId: string,
    reviewId: string,
  ): Promise<ReviewerCourseReviewWorkspaceResponseDto> {
    const reviewTask = await this.courseReviewRepository.findReviewWorkspace(
      reviewerId,
      reviewId,
    );

    if (!reviewTask) {
      throw new NotFoundException('REVIEW_TASK_NOT_FOUND');
    }

    if (!reviewTask.isReviewerAuthorized) {
      throw new ForbiddenException(
        'REVIEWER_NOT_AUTHORIZED_FOR_COURSE_CATEGORY',
      );
    }

    return plainToInstance(ReviewerCourseReviewWorkspaceResponseDto, reviewTask, {
      excludeExtraneousValues: true,
    });
  }

  async submitReviewDecision(
    reviewerId: string,
    reviewId: string,
    dto: SubmitCourseReviewDecisionDto,
  ): Promise<ReviewerCourseReviewDecisionResponseDto> {
    const reviewTask = await this.courseReviewRepository.findReviewWorkspace(
      reviewerId,
      reviewId,
    );

    if (!reviewTask) {
      throw new NotFoundException('REVIEW_TASK_NOT_FOUND');
    }

    if (!reviewTask.isReviewerAuthorized) {
      throw new ForbiddenException(
        'REVIEWER_NOT_AUTHORIZED_FOR_COURSE_CATEGORY',
      );
    }

    if (reviewTask.reviewStatus !== CourseReviewStatus.PENDING) {
      throw new BadRequestException('REVIEW_TASK_NOT_PENDING');
    }

    const reviewNote = this.normalizeReviewNote(dto.reviewNote);

    if (this.isReviewNoteRequired(dto.status) && !reviewNote) {
      throw new BadRequestException('REVIEW_NOTE_REQUIRED');
    }

    const result = await this.courseReviewRepository.submitReviewDecision({
      reviewerId,
      reviewId,
      reviewStatus: dto.status,
      reviewNote,
      courseStatus: this.toCourseStatus(dto.status),
    });

    if (!result) {
      throw new NotFoundException('REVIEW_TASK_NOT_FOUND');
    }

    return plainToInstance(ReviewerCourseReviewDecisionResponseDto, result, {
      excludeExtraneousValues: true,
    });
  }

  private isReviewNoteRequired(status: CourseReviewStatus): boolean {
    return (
      status === CourseReviewStatus.CHANGES_REQUESTED ||
      status === CourseReviewStatus.REJECTED
    );
  }

  private normalizeReviewNote(reviewNote?: string | null): string | null {
    if (typeof reviewNote !== 'string') {
      return null;
    }

    const normalizedReviewNote = reviewNote.trim();

    return normalizedReviewNote.length > 0 ? normalizedReviewNote : null;
  }

  private toCourseStatus(
    status: DecidedCourseReviewStatus,
  ): ReviewDecisionCourseStatus {
    switch (status) {
      case CourseReviewStatus.APPROVED:
        return CourseStatus.PUBLISHED;
      case CourseReviewStatus.CHANGES_REQUESTED:
        return CourseStatus.CHANGES_REQUESTED;
      case CourseReviewStatus.REJECTED:
        return CourseStatus.ARCHIVED;
    }
  }
}
