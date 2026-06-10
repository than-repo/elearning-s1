jest.mock(
  'generated/prisma/client',
  () => ({
    Prisma: {},
  }),
  { virtual: true },
);

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

jest.mock(
  'src/core/database/prisma.service',
  () => ({
    PrismaService: class PrismaService {},
  }),
  { virtual: true },
);

import {
  CourseLevel,
  CourseReviewStatus,
  CourseStatus,
} from 'generated/prisma/enums';

import {
  ReviewerCourseSortField,
  SortDirection,
} from '../dtos/course/reviewer-course-query.dto';
import { PrismaCourseReviewRepository } from './course-review.repository';

type CourseReviewDelegateMock = {
  findMany: jest.Mock;
  count: jest.Mock;
};

type PrismaServiceMock = {
  courseReview: CourseReviewDelegateMock;
};

const reviewerId = '11111111-1111-4111-8111-111111111111';
const reviewId = '22222222-2222-4222-8222-222222222222';
const courseId = '33333333-3333-4333-8333-333333333333';
const categoryId = '44444444-4444-4444-8444-444444444444';
const instructorId = '55555555-5555-4555-8555-555555555555';

describe('PrismaCourseReviewRepository', () => {
  let repository: PrismaCourseReviewRepository;
  let prisma: PrismaServiceMock;

  beforeEach(() => {
    prisma = {
      courseReview: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };

    repository = new PrismaCourseReviewRepository(
      prisma as unknown as ConstructorParameters<
        typeof PrismaCourseReviewRepository
      >[0],
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('findReviewableCourses scopes by reviewer, review status, course status, active course, and assigned active reviewer category', async () => {
    prisma.courseReview.findMany.mockResolvedValue([makeReviewTask()]);

    const result = await repository.findReviewableCourses({
      reviewerId,
      search: 'nestjs',
      level: CourseLevel.BEGINNER,
      status: CourseStatus.IN_REVIEW,
      categoryId,
      reviewStatus: CourseReviewStatus.PENDING,
      limit: 20,
      offset: 40,
      sortField: ReviewerCourseSortField.SUBMITTED_AT,
      sortDirection: SortDirection.DESC,
    });

    expect(prisma.courseReview.findMany).toHaveBeenCalledWith({
      where: {
        reviewerId,
        status: CourseReviewStatus.PENDING,
        course: {
          deletedAt: null,
          isActive: true,
          status: CourseStatus.IN_REVIEW,
          level: CourseLevel.BEGINNER,
          OR: [
            {
              title: {
                contains: 'nestjs',
              },
            },
            {
              shortDescription: {
                contains: 'nestjs',
              },
            },
            {
              description: {
                contains: 'nestjs',
              },
            },
          ],
          courseCategories: {
            some: {
              categoryId,
              category: {
                deletedAt: null,
                isActive: true,
                reviewerCategories: {
                  some: {
                    reviewerId,
                    isActive: true,
                  },
                },
              },
            },
          },
        },
      },
      include: expect.objectContaining({
        course: expect.objectContaining({
          include: expect.objectContaining({
            courseCategories: {
              where: {
                category: {
                  deletedAt: null,
                  isActive: true,
                },
              },
              include: {
                category: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                  },
                },
              },
            },
            instructors: expect.objectContaining({
              where: {
                deletedAt: null,
                isActive: true,
                instructor: {
                  isActive: true,
                },
              },
            }),
          }),
        }),
      }),
      orderBy: {
        submittedAt: SortDirection.DESC,
      },
      skip: 40,
      take: 20,
    });
    expect(result[0]).toMatchObject({
      reviewId,
      reviewStatus: CourseReviewStatus.PENDING,
      course: {
        id: courseId,
        categories: [
          {
            id: categoryId,
            name: 'Backend',
            slug: 'backend',
          },
        ],
        instructors: [
          {
            id: instructorId,
            fullName: 'Instructor One',
          },
        ],
      },
    });
  });

  it('countReviewableCourses uses the same reviewable course scope', async () => {
    prisma.courseReview.count.mockResolvedValue(3);

    const result = await repository.countReviewableCourses({
      reviewerId,
      status: CourseStatus.IN_REVIEW,
      reviewStatus: CourseReviewStatus.PENDING,
    });

    expect(prisma.courseReview.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        reviewerId,
        status: CourseReviewStatus.PENDING,
        course: expect.objectContaining({
          deletedAt: null,
          isActive: true,
          status: CourseStatus.IN_REVIEW,
        }),
      }),
    });
    expect(result).toBe(3);
  });

  it.each([
    [ReviewerCourseSortField.TITLE, { course: { title: SortDirection.ASC } }],
    [
      ReviewerCourseSortField.CREATED_AT,
      { course: { createdAt: SortDirection.ASC } },
    ],
    [
      ReviewerCourseSortField.UPDATED_AT,
      { course: { updatedAt: SortDirection.ASC } },
    ],
    [ReviewerCourseSortField.REVIEWED_AT, { reviewedAt: SortDirection.ASC }],
  ])('sorts by %s', async (sortField, expectedOrderBy) => {
    prisma.courseReview.findMany.mockResolvedValue([]);

    await repository.findReviewableCourses({
      reviewerId,
      status: CourseStatus.IN_REVIEW,
      reviewStatus: CourseReviewStatus.PENDING,
      limit: 10,
      offset: 0,
      sortField,
      sortDirection: SortDirection.ASC,
    });

    expect(prisma.courseReview.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: expectedOrderBy,
      }),
    );
  });
});

function makeDecimal(value: number): { toNumber: () => number } {
  return {
    toNumber: () => value,
  };
}

function makeReviewTask(overrides: Record<string, unknown> = {}) {
  const now = new Date('2026-06-10T00:00:00.000Z');

  return {
    id: reviewId,
    status: CourseReviewStatus.PENDING,
    reviewNote: null,
    submittedAt: now,
    reviewedAt: null,
    course: {
      id: courseId,
      title: 'NestJS Masterclass',
      slug: 'nestjs-masterclass',
      shortDescription: 'Learn how to build production-ready APIs.',
      description: 'A complete NestJS course.',
      whatYouWillLearn: ['Build APIs', 123],
      requirements: ['TypeScript basics', false],
      thumbnailUrl: 'https://example.com/thumb.jpg',
      level: CourseLevel.BEGINNER,
      price: makeDecimal(49.99),
      language: 'en',
      durationInMinutes: 120,
      certificateEnabled: true,
      status: CourseStatus.IN_REVIEW,
      isActive: true,
      publishedAt: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      courseCategories: [
        {
          category: {
            id: categoryId,
            name: 'Backend',
            slug: 'backend',
          },
        },
      ],
      instructors: [
        {
          instructor: {
            id: instructorId,
            fullName: 'Instructor One',
          },
        },
      ],
    },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}
