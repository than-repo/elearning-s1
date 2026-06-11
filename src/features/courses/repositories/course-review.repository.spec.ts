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
  AvailableReviewerCourseSortField,
  ReviewerCourseSortField,
  SortDirection,
} from '../dtos/course/reviewer-course-query.dto';
import { CourseReviewRepository } from './course-review.repository';

type CourseReviewDelegateMock = {
  findMany: jest.Mock;
  findFirst: jest.Mock;
  create: jest.Mock;
  count: jest.Mock;
  update: jest.Mock;
};

type PrismaServiceMock = {
  courseReview: CourseReviewDelegateMock;
  course: {
    findMany: jest.Mock;
    findFirst: jest.Mock;
    count: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
  };
  $transaction: jest.Mock;
};

const reviewerId = '11111111-1111-4111-8111-111111111111';
const reviewId = '22222222-2222-4222-8222-222222222222';
const courseId = '33333333-3333-4333-8333-333333333333';
const categoryId = '44444444-4444-4444-8444-444444444444';
const instructorId = '55555555-5555-4555-8555-555555555555';

describe('CourseReviewRepository', () => {
  let repository: CourseReviewRepository;
  let prisma: PrismaServiceMock;

  beforeEach(() => {
    prisma = {
      courseReview: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      course: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn(async (callback) => callback(prisma)),
    };

    repository = new CourseReviewRepository(
      prisma as unknown as ConstructorParameters<typeof CourseReviewRepository>[0],
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('findAvailableCourses scopes unclaimed in-review courses by active authorized category', async () => {
    prisma.course.findMany.mockResolvedValue([makeReviewTask().course]);

    const result = await repository.findAvailableCourses({
      reviewerId,
      search: 'nestjs',
      level: CourseLevel.BEGINNER,
      categoryId,
      limit: 20,
      offset: 40,
      sortField: AvailableReviewerCourseSortField.UPDATED_AT,
      sortDirection: SortDirection.DESC,
    });

    expect(prisma.course.findMany).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        isActive: true,
        status: CourseStatus.IN_REVIEW,
        reviewClaimedById: null,
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
      include: expect.objectContaining({
        courseCategories: expect.any(Object),
        instructors: expect.any(Object),
      }),
      orderBy: {
        updatedAt: SortDirection.DESC,
      },
      skip: 40,
      take: 20,
    });
    expect(result[0]).toMatchObject({
      id: courseId,
      title: 'NestJS Masterclass',
      status: CourseStatus.IN_REVIEW,
    });
  });

  it('claims a course atomically and creates a pending review task', async () => {
    const now = new Date('2026-06-10T00:00:00.000Z');
    prisma.course.findFirst.mockResolvedValue({
      id: courseId,
      reviewClaimedById: null,
    });
    prisma.course.updateMany.mockResolvedValue({
      count: 1,
    });
    prisma.courseReview.create.mockResolvedValue({
      id: reviewId,
      status: CourseReviewStatus.PENDING,
      submittedAt: now,
      course: {
        id: courseId,
        status: CourseStatus.IN_REVIEW,
        reviewClaimedById: reviewerId,
        reviewClaimedAt: now,
      },
    });

    const result = await repository.claimCourseForReview(reviewerId, courseId);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.course.findFirst).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: courseId,
        deletedAt: null,
        isActive: true,
        status: CourseStatus.IN_REVIEW,
        courseCategories: expect.any(Object),
      }),
      select: {
        id: true,
        reviewClaimedById: true,
      },
    });
    expect(prisma.course.updateMany).toHaveBeenCalledWith({
      where: {
        id: courseId,
        status: CourseStatus.IN_REVIEW,
        reviewClaimedById: null,
      },
      data: {
        reviewClaimedById: reviewerId,
        reviewClaimedAt: expect.any(Date),
      },
    });
    expect(prisma.courseReview.create).toHaveBeenCalledWith({
      data: {
        courseId,
        reviewerId,
        status: CourseReviewStatus.PENDING,
        submittedAt: expect.any(Date),
      },
      select: expect.any(Object),
    });
    expect(result).toMatchObject({
      status: 'claimed',
      data: {
        reviewId,
        reviewStatus: CourseReviewStatus.PENDING,
        course: {
          id: courseId,
          reviewClaimedById: reviewerId,
        },
      },
    });
  });

  it('returns already_claimed when the atomic claim update loses the race', async () => {
    prisma.course.findFirst.mockResolvedValue({
      id: courseId,
      reviewClaimedById: null,
    });
    prisma.course.updateMany.mockResolvedValue({
      count: 0,
    });

    const result = await repository.claimCourseForReview(reviewerId, courseId);

    expect(prisma.courseReview.create).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: 'already_claimed',
    });
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
          reviewClaimedById: reviewerId,
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
          reviewClaimedById: reviewerId,
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

  it('findReviewWorkspace loads a valid assigned review task with full course content', async () => {
    prisma.courseReview.findFirst.mockResolvedValue(makeWorkspaceReviewTask());

    const result = await repository.findReviewWorkspace(reviewerId, reviewId);

    expect(prisma.courseReview.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: reviewId,
          reviewerId,
          course: expect.objectContaining({
            deletedAt: null,
            isActive: true,
            reviewClaimedById: reviewerId,
            status: CourseStatus.IN_REVIEW,
          }),
        }),
        include: expect.objectContaining({
          course: expect.objectContaining({
            include: expect.objectContaining({
              sections: expect.objectContaining({
                include: expect.objectContaining({
                  lessons: expect.objectContaining({
                    include: expect.objectContaining({
                      files: expect.any(Object),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      }),
    );
    expect(result).toMatchObject({
      reviewId,
      isReviewerAuthorized: true,
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
  });

  it('marks workspace as unauthorized when reviewer category authorization is inactive', async () => {
    prisma.courseReview.findFirst.mockResolvedValue(
      makeWorkspaceReviewTask({
        course: {
          ...makeWorkspaceReviewTask().course,
          courseCategories: [
            {
              category: {
                id: categoryId,
                name: 'Backend',
                slug: 'backend',
                reviewerCategories: [
                  {
                    reviewerId,
                    categoryId,
                    isActive: false,
                  },
                ],
              },
            },
          ],
        },
      }),
    );

    const result = await repository.findReviewWorkspace(reviewerId, reviewId);

    expect(result?.isReviewerAuthorized).toBe(false);
  });

  it('submits a review decision and updates the course in a transaction', async () => {
    const now = new Date('2026-06-10T00:00:00.000Z');
    prisma.courseReview.findFirst.mockResolvedValue({
      id: reviewId,
      courseId,
    });
    prisma.course.update.mockResolvedValue({
      id: courseId,
      status: CourseStatus.PUBLISHED,
      publishedAt: now,
      updatedAt: now,
    });
    prisma.courseReview.update.mockResolvedValue({
      id: reviewId,
      status: CourseReviewStatus.APPROVED,
      reviewNote: null,
      submittedAt: now,
      reviewedAt: now,
    });

    const result = await repository.submitReviewDecision({
      reviewerId,
      reviewId,
      reviewStatus: CourseReviewStatus.APPROVED,
      reviewNote: null,
      courseStatus: CourseStatus.PUBLISHED,
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.courseReview.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: reviewId,
          reviewerId,
          status: CourseReviewStatus.PENDING,
          course: expect.objectContaining({
            status: CourseStatus.IN_REVIEW,
            reviewClaimedById: reviewerId,
            courseCategories: expect.any(Object),
          }),
        }),
        select: {
          id: true,
          courseId: true,
        },
      }),
    );
    expect(prisma.course.update).toHaveBeenCalledWith({
      where: {
        id: courseId,
      },
      data: {
        status: CourseStatus.PUBLISHED,
        publishedAt: expect.any(Date),
        reviewClaimedById: null,
        reviewClaimedAt: null,
      },
      select: {
        id: true,
        status: true,
        publishedAt: true,
        updatedAt: true,
      },
    });
    expect(prisma.courseReview.update).toHaveBeenCalledWith({
      where: {
        id: reviewId,
      },
      data: {
        status: CourseReviewStatus.APPROVED,
        reviewNote: null,
        reviewedAt: expect.any(Date),
      },
      select: {
        id: true,
        status: true,
        reviewNote: true,
        submittedAt: true,
        reviewedAt: true,
      },
    });
    expect(result).toMatchObject({
      reviewId,
      reviewStatus: CourseReviewStatus.APPROVED,
      course: {
        status: CourseStatus.PUBLISHED,
      },
    });
  });

  it('returns null when the review task cannot be decided', async () => {
    prisma.courseReview.findFirst.mockResolvedValue(null);

    const result = await repository.submitReviewDecision({
      reviewerId,
      reviewId,
      reviewStatus: CourseReviewStatus.APPROVED,
      reviewNote: null,
      courseStatus: CourseStatus.PUBLISHED,
    });

    expect(prisma.course.update).not.toHaveBeenCalled();
    expect(prisma.courseReview.update).not.toHaveBeenCalled();
    expect(result).toBeNull();
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

function makeWorkspaceReviewTask(overrides: Record<string, unknown> = {}) {
  const now = new Date('2026-06-10T00:00:00.000Z');

  return {
    ...makeReviewTask(),
    reviewerId,
    course: {
      ...makeReviewTask().course,
      courseCategories: [
        {
          category: {
            id: categoryId,
            name: 'Backend',
            slug: 'backend',
            reviewerCategories: [
              {
                reviewerId,
                categoryId,
                isActive: true,
              },
            ],
          },
        },
      ],
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
                  type: 'VIDEO',
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
