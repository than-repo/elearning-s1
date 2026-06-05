// src/features/courses/interfaces/course-review.repository.interface.ts

import {
  CourseLevel,
  CourseReviewStatus,
  CourseStatus,
} from 'generated/prisma/enums';

import {
  ReviewerCourseSortField,
  SortDirection,
} from '../dtos/course/reviewer-course-query.dto';

export interface FindReviewableCoursesParams {
  reviewerId: string;

  search?: string;
  level?: CourseLevel;
  status?: CourseStatus;
  categoryId?: string;

  reviewStatus: CourseReviewStatus;

  limit: number;
  offset: number;

  sortField: ReviewerCourseSortField;
  sortDirection: SortDirection;
}

export interface CourseReviewCourseModel {
  reviewId: string;
  reviewStatus: CourseReviewStatus;
  reviewNote?: string | null;
  submittedAt: Date;
  reviewedAt?: Date | null;

  course: {
    id: string;
    title: string;
    slug: string;
    shortDescription: string;
    description?: string | null;
    whatYouWillLearn?: string[] | null;
    requirements?: string[] | null;
    thumbnailUrl?: string | null;
    level: CourseLevel;
    price?: number | null;
    language?: string | null;
    durationInMinutes?: number | null;
    certificateEnabled: boolean;
    status: CourseStatus;
    isActive: boolean;
    publishedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date | null;

    categories?: {
      id: string;
      name: string;
      slug: string;
    }[];

    instructors?: {
      id: string;
      fullName: string;
    }[];
  };
}

export interface ICourseReviewRepository {
  findReviewableCourses(
    params: FindReviewableCoursesParams,
  ): Promise<CourseReviewCourseModel[]>;

  countReviewableCourses(
    params: Omit<
      FindReviewableCoursesParams,
      'limit' | 'offset' | 'sortField' | 'sortDirection'
    >,
  ): Promise<number>;
}
