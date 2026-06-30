// src/features/courses/interfaces/course-review.repository.interface.ts

import {
  CourseLevel,
  MediaTypeEnum,
  CourseReviewStatus,
  CourseStatus,
} from 'generated/prisma/enums';

import {
  AvailableReviewerCourseSortField,
  ReviewerCourseSortField,
  SortDirection,
} from '../dtos/course/reviewer-course-query.dto';

export type DecidedCourseReviewStatus =
  | (typeof CourseReviewStatus)['APPROVED']
  | (typeof CourseReviewStatus)['CHANGES_REQUESTED']
  | (typeof CourseReviewStatus)['REJECTED'];

export type ReviewDecisionCourseStatus =
  | (typeof CourseStatus)['PUBLISHED']
  | (typeof CourseStatus)['CHANGES_REQUESTED']
  | (typeof CourseStatus)['ARCHIVED'];

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

export interface FindAvailableReviewCoursesParams {
  reviewerId: string;

  search?: string;
  level?: CourseLevel;
  categoryId?: string;

  limit: number;
  offset: number;

  sortField: AvailableReviewerCourseSortField;
  sortDirection: SortDirection;
}

export interface AvailableReviewCourseModel {
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

export interface CourseReviewWorkspaceModel extends CourseReviewCourseModel {
  isReviewerAuthorized: boolean;

  course: CourseReviewCourseModel['course'] & {
    sections: {
      id: string;
      courseId: string;
      title: string;
      description?: string | null;
      sectionIndex: number;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
      deletedAt?: Date | null;
      lessons: {
        id: string;
        sectionId: string;
        title: string;
        description?: string | null;
        lessonIndex: number;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        deletedAt?: Date | null;
        files: {
          id: string;
          lessonId: string;
          cloudinaryPublicId?: string | null;
          url: string;
          type: MediaTypeEnum;
          filename?: string | null;
          mimeType?: string | null;
          sizeInBytes?: number | null;
          createdAt: Date;
          updatedAt: Date;
          deletedAt?: Date | null;
        }[];
      }[];
    }[];
  };
}

export interface CourseReviewDecisionInput {
  reviewerId: string;
  reviewId: string;
  reviewStatus: DecidedCourseReviewStatus;
  reviewNote?: string | null;
  courseStatus: ReviewDecisionCourseStatus;
}

export interface CourseReviewDecisionModel {
  reviewId: string;
  reviewStatus: CourseReviewStatus;
  reviewNote?: string | null;
  submittedAt: Date;
  reviewedAt?: Date | null;
  course: {
    id: string;
    status: CourseStatus;
    publishedAt?: Date | null;
    updatedAt: Date;
  };
}

export interface ClaimCourseReviewModel {
  reviewId: string;
  reviewStatus: CourseReviewStatus;
  submittedAt: Date;
  course: {
    id: string;
    status: CourseStatus;
    reviewClaimedById?: string | null;
    reviewClaimedAt?: Date | null;
  };
}

export type ClaimCourseForReviewResult =
  | {
      status: 'claimed';
      data: ClaimCourseReviewModel;
    }
  | {
      status: 'not_found';
    }
  | {
      status: 'already_claimed';
    };

export interface InstructorCourseLatestReviewModel {
  reviewId: string;
  courseId: string;
  courseStatus: CourseStatus;
  reviewStatus: CourseReviewStatus;
  reviewNote?: string | null;
  submittedAt: Date;
  reviewedAt?: Date | null;
}

export interface ICourseReviewRepository {
  findAvailableCourses(
    params: FindAvailableReviewCoursesParams,
  ): Promise<AvailableReviewCourseModel[]>;

  countAvailableCourses(
    params: Omit<
      FindAvailableReviewCoursesParams,
      'limit' | 'offset' | 'sortField' | 'sortDirection'
    >,
  ): Promise<number>;

  claimCourseForReview(
    reviewerId: string,
    courseId: string,
  ): Promise<ClaimCourseForReviewResult>;

  findReviewableCourses(
    params: FindReviewableCoursesParams,
  ): Promise<CourseReviewCourseModel[]>;

  countReviewableCourses(
    params: Omit<
      FindReviewableCoursesParams,
      'limit' | 'offset' | 'sortField' | 'sortDirection'
    >,
  ): Promise<number>;

  findReviewWorkspace(
    reviewerId: string,
    reviewId: string,
  ): Promise<CourseReviewWorkspaceModel | null>;

  submitReviewDecision(
    input: CourseReviewDecisionInput,
  ): Promise<CourseReviewDecisionModel | null>;

  findLatestCompletedReviewByCourseId(
    courseId: string,
  ): Promise<InstructorCourseLatestReviewModel | null>;

  findMyChangedRequest(
    reviewerId: string,
  ): Promise<AvailableReviewCourseModel[]>;
}
