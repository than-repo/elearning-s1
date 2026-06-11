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

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  CourseLevel,
  CourseReviewStatus,
  CourseStatus,
} from 'generated/prisma/enums';

import type {
  AvailableReviewCourseModel,
  ClaimCourseReviewModel,
  CourseReviewCourseModel,
  CourseReviewDecisionModel,
  CourseReviewWorkspaceModel,
  ICourseReviewRepository,
} from '../interfaces/course-review.repository.interface';
import { COURSE_REVIEW_REPOSITORY } from '../repositories/course-review-repository.token';
import {
  AvailableReviewerCourseSortField,
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
      findAvailableCourses: jest.fn(),
      countAvailableCourses: jest.fn(),
      claimCourseForReview: jest.fn(),
      findReviewableCourses: jest.fn(),
      countReviewableCourses: jest.fn(),
      findReviewWorkspace: jest.fn(),
      submitReviewDecision: jest.fn(),
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

  it('lists available unclaimed courses using reviewer category authorization', async () => {
    courseReviewRepository.findAvailableCourses.mockResolvedValue([
      makeAvailableCourse(),
    ]);
    courseReviewRepository.countAvailableCourses.mockResolvedValue(1);

    const result = await service.findAvailableCourses(reviewerId, {});

    expect(courseReviewRepository.findAvailableCourses).toHaveBeenCalledWith({
      reviewerId,
      search: undefined,
      level: undefined,
      categoryId: undefined,
      limit: 10,
      offset: 0,
      sortField: AvailableReviewerCourseSortField.UPDATED_AT,
      sortDirection: SortDirection.DESC,
    });
    expect(courseReviewRepository.countAvailableCourses).toHaveBeenCalledWith({
      reviewerId,
      search: undefined,
      level: undefined,
      categoryId: undefined,
    });
    expect(result.data[0]).toMatchObject({
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
    });
  });

  it('claims an available course and returns the created review id', async () => {
    courseReviewRepository.claimCourseForReview.mockResolvedValue({
      status: 'claimed',
      data: makeClaimResult(),
    });

    const result = await service.claimCourseForReview(reviewerId, courseId);

    expect(courseReviewRepository.claimCourseForReview).toHaveBeenCalledWith(
      reviewerId,
      courseId,
    );
    expect(result).toMatchObject({
      reviewId,
      reviewStatus: CourseReviewStatus.PENDING,
      course: {
        id: courseId,
        status: CourseStatus.IN_REVIEW,
        reviewClaimedById: reviewerId,
      },
    });
  });

  it('hides unavailable courses when claiming', async () => {
    courseReviewRepository.claimCourseForReview.mockResolvedValue({
      status: 'not_found',
    });

    await expect(
      service.claimCourseForReview(reviewerId, courseId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns a conflict when another reviewer already claimed the course', async () => {
    courseReviewRepository.claimCourseForReview.mockResolvedValue({
      status: 'already_claimed',
    });

    await expect(
      service.claimCourseForReview(reviewerId, courseId),
    ).rejects.toBeInstanceOf(ConflictException);
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

  it('returns the full review workspace for an assigned authorized review task', async () => {
    const reviewTask = makeReviewWorkspace();
    courseReviewRepository.findReviewWorkspace.mockResolvedValue(reviewTask);

    const result = await service.getReviewWorkspace(reviewerId, reviewId);

    expect(courseReviewRepository.findReviewWorkspace).toHaveBeenCalledWith(
      reviewerId,
      reviewId,
    );
    expect(result).toMatchObject({
      reviewId,
      reviewStatus: CourseReviewStatus.PENDING,
      course: {
        id: courseId,
        sections: [
          {
            title: 'Introduction',
            lessons: [
              {
                title: 'Welcome',
                files: [
                  {
                    filename: 'welcome.mp4',
                  },
                ],
              },
            ],
          },
        ],
      },
    });
    expect('isReviewerAuthorized' in result).toBe(false);
  });

  it('hides missing or invalid review tasks', async () => {
    courseReviewRepository.findReviewWorkspace.mockResolvedValue(null);

    await expect(
      service.getReviewWorkspace(reviewerId, reviewId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('blocks review workspace access when category authorization was removed', async () => {
    courseReviewRepository.findReviewWorkspace.mockResolvedValue(
      makeReviewWorkspace({ isReviewerAuthorized: false }),
    );

    await expect(
      service.getReviewWorkspace(reviewerId, reviewId),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('submits an approved review decision and publishes the course', async () => {
    courseReviewRepository.findReviewWorkspace.mockResolvedValue(
      makeReviewWorkspace(),
    );
    courseReviewRepository.submitReviewDecision.mockResolvedValue(
      makeReviewDecision({ reviewStatus: CourseReviewStatus.APPROVED }),
    );

    const result = await service.submitReviewDecision(reviewerId, reviewId, {
      status: CourseReviewStatus.APPROVED,
    });

    expect(courseReviewRepository.submitReviewDecision).toHaveBeenCalledWith({
      reviewerId,
      reviewId,
      reviewStatus: CourseReviewStatus.APPROVED,
      reviewNote: null,
      courseStatus: CourseStatus.PUBLISHED,
    });
    expect(result).toMatchObject({
      reviewId,
      reviewStatus: CourseReviewStatus.APPROVED,
      course: {
        status: CourseStatus.PUBLISHED,
      },
    });
  });

  it('requires a note for rejected reviews', async () => {
    courseReviewRepository.findReviewWorkspace.mockResolvedValue(
      makeReviewWorkspace(),
    );

    await expect(
      service.submitReviewDecision(reviewerId, reviewId, {
        status: CourseReviewStatus.REJECTED,
        reviewNote: '   ',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(courseReviewRepository.submitReviewDecision).not.toHaveBeenCalled();
  });

  it('blocks decisions for non-pending review tasks', async () => {
    courseReviewRepository.findReviewWorkspace.mockResolvedValue(
      makeReviewWorkspace({
        reviewStatus: CourseReviewStatus.CHANGES_REQUESTED,
      }),
    );

    await expect(
      service.submitReviewDecision(reviewerId, reviewId, {
        status: CourseReviewStatus.APPROVED,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(courseReviewRepository.submitReviewDecision).not.toHaveBeenCalled();
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

function makeAvailableCourse(
  overrides: Partial<AvailableReviewCourseModel> = {},
): AvailableReviewCourseModel {
  return {
    ...makeReviewTask().course,
    ...overrides,
  };
}

function makeClaimResult(
  overrides: Partial<ClaimCourseReviewModel> = {},
): ClaimCourseReviewModel {
  const now = new Date('2026-06-10T00:00:00.000Z');

  return {
    reviewId,
    reviewStatus: CourseReviewStatus.PENDING,
    submittedAt: now,
    course: {
      id: courseId,
      status: CourseStatus.IN_REVIEW,
      reviewClaimedById: reviewerId,
      reviewClaimedAt: now,
    },
    ...overrides,
  };
}

function makeReviewWorkspace(
  overrides: Partial<CourseReviewWorkspaceModel> = {},
): CourseReviewWorkspaceModel {
  const now = new Date('2026-06-10T00:00:00.000Z');

  return {
    ...makeReviewTask(),
    isReviewerAuthorized: true,
    course: {
      ...makeReviewTask().course,
      sections: [
        {
          id: '66666666-6666-4666-8666-666666666666',
          courseId,
          title: 'Introduction',
          description: 'Start here.',
          sectionIndex: 0,
          isActive: true,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
          lessons: [
            {
              id: '77777777-7777-4777-8777-777777777777',
              sectionId: '66666666-6666-4666-8666-666666666666',
              title: 'Welcome',
              description: 'Course welcome.',
              lessonIndex: 0,
              isActive: true,
              createdAt: now,
              updatedAt: now,
              deletedAt: null,
              files: [
                {
                  id: '88888888-8888-4888-8888-888888888888',
                  lessonId: '77777777-7777-4777-8777-777777777777',
                  cloudinaryPublicId: 'courses/welcome',
                  url: 'https://example.com/welcome.mp4',
                  type: 'VIDEO' as never,
                  filename: 'welcome.mp4',
                  mimeType: 'video/mp4',
                  sizeInBytes: 1024,
                  createdAt: now,
                  updatedAt: now,
                  deletedAt: null,
                },
              ],
            },
          ],
        },
      ],
    },
    ...overrides,
  };
}

function makeReviewDecision(
  overrides: Partial<CourseReviewDecisionModel> = {},
): CourseReviewDecisionModel {
  const now = new Date('2026-06-10T00:00:00.000Z');

  return {
    reviewId,
    reviewStatus: CourseReviewStatus.APPROVED,
    reviewNote: null,
    submittedAt: now,
    reviewedAt: now,
    course: {
      id: courseId,
      status: CourseStatus.PUBLISHED,
      publishedAt: now,
      updatedAt: now,
    },
    ...overrides,
  };
}
