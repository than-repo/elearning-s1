jest.mock(
  'generated/prisma/enums',
  () => ({
    CourseLevel: {
      BEGINNER: 'BEGINNER',
      INTERMEDIATE: 'INTERMEDIATE',
      ADVANCE: 'ADVANCE',
      ALL_LEVELS: 'ALL_LEVELS',
    },
    CourseReviewStatus: {
      PENDING: 'PENDING',
      APPROVED: 'APPROVED',
      REJECTED: 'REJECTED',
      CHANGES_REQUESTED: 'CHANGES_REQUESTED',
    },
    CourseStatus: {
      DRAFT: 'DRAFT',
      PUBLISHED: 'PUBLISHED',
      ARCHIVED: 'ARCHIVED',
      IN_REVIEW: 'IN_REVIEW',
      CHANGES_REQUESTED: 'CHANGES_REQUESTED',
    },
  }),
  { virtual: true },
);

import { Test, TestingModule } from '@nestjs/testing';
import {
  CourseLevel,
  CourseReviewStatus,
  CourseStatus,
} from 'generated/prisma/enums';

import type {
  CourseReviewCourseModel,
  ICourseReviewRepository,
} from '../interfaces/course-review.repository.interface';
import { COURSE_REVIEW_REPOSITORY } from '../repositories/course-review-repository.token';
import {
  ReviewerCourseSortField,
  SortDirection,
} from '../dtos/course/reviewer-course-query.dto';
import { ReviewerCoursesService } from './reviewer-courses.service';

type CourseReviewRepositoryMock = jest.Mocked<ICourseReviewRepository>;

const reviewerId = '11111111-1111-4111-8111-111111111111';
const reviewId = '22222222-2222-4222-8222-222222222222';
const courseId = '33333333-3333-4333-8333-333333333333';
const categoryId = '44444444-4444-4444-8444-444444444444';

describe('ReviewerCoursesService', () => {
  let service: ReviewerCoursesService;
  let courseReviewRepository: CourseReviewRepositoryMock;

  beforeEach(async () => {
    courseReviewRepository = {
      findReviewableCourses: jest.fn(),
      countReviewableCourses: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewerCoursesService,
        {
          provide: COURSE_REVIEW_REPOSITORY,
          useValue: courseReviewRepository,
        },
      ],
    }).compile();

    service = module.get(ReviewerCoursesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('defaults to pending reviews for in-review courses', async () => {
    courseReviewRepository.findReviewableCourses.mockResolvedValue([
      makeReviewTask(),
    ]);
    courseReviewRepository.countReviewableCourses.mockResolvedValue(1);

    const result = await service.findReviewableCourses(reviewerId, {});

    expect(courseReviewRepository.findReviewableCourses).toHaveBeenCalledWith({
      reviewerId,
      search: undefined,
      level: undefined,
      status: CourseStatus.IN_REVIEW,
      categoryId: undefined,
      reviewStatus: CourseReviewStatus.PENDING,
      limit: 10,
      offset: 0,
      sortField: ReviewerCourseSortField.SUBMITTED_AT,
      sortDirection: SortDirection.DESC,
    });
    expect(courseReviewRepository.countReviewableCourses).toHaveBeenCalledWith({
      reviewerId,
      search: undefined,
      level: undefined,
      status: CourseStatus.IN_REVIEW,
      categoryId: undefined,
      reviewStatus: CourseReviewStatus.PENDING,
    });
    expect(result.meta).toEqual({
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    });
  });

  it('honors provided review status, course status, filters, sorting, and pagination', async () => {
    courseReviewRepository.findReviewableCourses.mockResolvedValue([]);
    courseReviewRepository.countReviewableCourses.mockResolvedValue(51);

    const result = await service.findReviewableCourses(reviewerId, {
      search: 'nestjs',
      level: CourseLevel.BEGINNER,
      status: CourseStatus.CHANGES_REQUESTED,
      reviewStatus: CourseReviewStatus.CHANGES_REQUESTED,
      categoryId,
      page: 3,
      limit: 20,
      sortField: ReviewerCourseSortField.TITLE,
      sortDirection: SortDirection.ASC,
    });

    expect(courseReviewRepository.findReviewableCourses).toHaveBeenCalledWith({
      reviewerId,
      search: 'nestjs',
      level: CourseLevel.BEGINNER,
      status: CourseStatus.CHANGES_REQUESTED,
      categoryId,
      reviewStatus: CourseReviewStatus.CHANGES_REQUESTED,
      limit: 20,
      offset: 40,
      sortField: ReviewerCourseSortField.TITLE,
      sortDirection: SortDirection.ASC,
    });
    expect(result.meta).toEqual({
      page: 3,
      limit: 20,
      total: 51,
      totalPages: 3,
      hasNextPage: false,
      hasPreviousPage: true,
    });
  });

  it('returns review metadata with the nested reviewer-visible course', async () => {
    const reviewTask = makeReviewTask();
    courseReviewRepository.findReviewableCourses.mockResolvedValue([
      reviewTask,
    ]);
    courseReviewRepository.countReviewableCourses.mockResolvedValue(1);

    const result = await service.findReviewableCourses(reviewerId, {});

    expect(result.data[0]).toMatchObject({
      reviewId,
      reviewStatus: CourseReviewStatus.PENDING,
      reviewNote: null,
      submittedAt: reviewTask.submittedAt,
      reviewedAt: null,
      course: {
        id: courseId,
        title: 'NestJS Masterclass',
        status: CourseStatus.IN_REVIEW,
        categories: [
          {
            id: categoryId,
            name: 'Backend',
            slug: 'backend',
          },
        ],
      },
    });
    expect(result.data[0].course.deletedAt).toBeUndefined();
  });
});

function makeReviewTask(
  overrides: Partial<CourseReviewCourseModel> = {},
): CourseReviewCourseModel {
  const now = new Date('2026-06-10T00:00:00.000Z');

  return {
    reviewId,
    reviewStatus: CourseReviewStatus.PENDING,
    reviewNote: null,
    submittedAt: now,
    reviewedAt: null,
    course: {
      id: courseId,
      title: 'NestJS Masterclass',
      slug: 'nestjs-masterclass',
      shortDescription: 'Learn how to build production-ready APIs.',
      description: 'A complete NestJS course.',
      whatYouWillLearn: ['Build APIs'],
      requirements: ['TypeScript basics'],
      thumbnailUrl: 'https://example.com/thumb.jpg',
      level: CourseLevel.BEGINNER,
      price: 49.99,
      language: 'en',
      durationInMinutes: 120,
      certificateEnabled: true,
      status: CourseStatus.IN_REVIEW,
      isActive: true,
      publishedAt: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      categories: [
        {
          id: categoryId,
          name: 'Backend',
          slug: 'backend',
        },
      ],
      instructors: [
        {
          id: '55555555-5555-4555-8555-555555555555',
          fullName: 'Instructor One',
        },
      ],
    },
    ...overrides,
  };
}
