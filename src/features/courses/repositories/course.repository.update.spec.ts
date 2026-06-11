jest.mock(
  'generated/prisma/client',
  () => ({
    CourseStatus: {
      DRAFT: 'DRAFT',
      PUBLISHED: 'PUBLISHED',
      ARCHIVED: 'ARCHIVED',
      IN_REVIEW: 'IN_REVIEW',
      CHANGES_REQUESTED: 'CHANGES_REQUESTED',
    },
    Prisma: {
      JsonNull: 'JsonNull',
    },
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

import { CourseStatus, Prisma } from 'generated/prisma/client';
import { CourseLevel } from 'generated/prisma/enums';

import { CourseRepository } from './course.repository';

type TransactionClientMock = {
  course: {
    update: jest.Mock;
    updateMany: jest.Mock;
    findFirst: jest.Mock;
  };
  courseCategory: {
    deleteMany: jest.Mock;
    createMany: jest.Mock;
  };
};

type PrismaServiceMock = {
  $transaction: jest.Mock;
};

const courseId = '11111111-1111-4111-8111-111111111111';
const instructorId = '22222222-2222-4222-8222-222222222222';
const categoryId = '33333333-3333-4333-8333-333333333333';
const secondCategoryId = '44444444-4444-4444-8444-444444444444';

describe('CourseRepository update behavior', () => {
  let repository: CourseRepository;
  let prisma: PrismaServiceMock;
  let tx: TransactionClientMock;

  beforeEach(() => {
    tx = {
      course: {
        update: jest.fn(),
        updateMany: jest.fn(),
        findFirst: jest.fn(),
      },
      courseCategory: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
    };

    prisma = {
      $transaction: jest.fn(
        (callback: (client: TransactionClientMock) => unknown) => callback(tx),
      ),
    };

    repository = new CourseRepository(
      prisma as unknown as ConstructorParameters<typeof CourseRepository>[0],
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('update', () => {
    it('updates scalar fields inside a transaction and does not touch categories when categoryIds is omitted', async () => {
      tx.course.update.mockResolvedValue(
        makeCourseWithDetails({
          title: 'Updated Course',
          price: makeDecimal(99.99),
        }),
      );

      const result = await repository.update(courseId, {
        title: 'Updated Course',
        price: 99.99,
        instructorId,
        requirements: ['TypeScript basics'],
        whatYouWillLearn: ['Build APIs'],
      });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.courseCategory.deleteMany).not.toHaveBeenCalled();
      expect(tx.courseCategory.createMany).not.toHaveBeenCalled();
      expect(tx.course.update).toHaveBeenCalledWith({
        where: {
          id: courseId,
          deletedAt: null,
        },
        data: {
          title: 'Updated Course',
          price: 99.99,
          requirements: ['TypeScript basics'],
          whatYouWillLearn: ['Build APIs'],
        },
        include: expect.any(Object),
      });
      expect(tx.course.update.mock.calls[0][0].data).not.toHaveProperty(
        'instructorId',
      );
      expect(result).toEqual(
        expect.objectContaining({
          id: courseId,
          title: 'Updated Course',
          price: 99.99,
          requirements: ['TypeScript basics'],
          whatYouWillLearn: ['Build APIs'],
        }),
      );
    });

    it('replaces category relations when categoryIds is present', async () => {
      tx.course.update.mockResolvedValue(makeCourseWithDetails());

      await repository.update(courseId, {
        categoryIds: [categoryId, secondCategoryId],
      });

      expect(tx.courseCategory.deleteMany).toHaveBeenCalledWith({
        where: {
          courseId,
        },
      });
      expect(tx.courseCategory.createMany).toHaveBeenCalledWith({
        data: [
          {
            categoryId,
            courseId,
          },
          {
            categoryId: secondCategoryId,
            courseId,
          },
        ],
      });
      expect(tx.course.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: courseId,
            deletedAt: null,
          },
        }),
      );
    });

    it('allows empty categoryIds to remove all category links without creating new ones', async () => {
      tx.course.update.mockResolvedValue(makeCourseWithDetails());

      await repository.update(courseId, {
        categoryIds: [],
      });

      expect(tx.courseCategory.deleteMany).toHaveBeenCalledWith({
        where: {
          courseId,
        },
      });
      expect(tx.courseCategory.createMany).not.toHaveBeenCalled();
    });

    it('converts null JSON arrays to Prisma JsonNull and leaves undefined JSON fields undefined', async () => {
      tx.course.update.mockResolvedValue(
        makeCourseWithDetails({
          whatYouWillLearn: null,
          requirements: null,
        }),
      );

      await repository.update(courseId, {
        whatYouWillLearn: null,
        requirements: undefined,
      });

      expect(tx.course.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            whatYouWillLearn: Prisma.JsonNull,
            requirements: undefined,
          }),
        }),
      );
    });
  });

  describe('updateDraftCourse', () => {
    it('updates only non-deleted draft or changes-requested courses', async () => {
      tx.course.update.mockResolvedValue(
        makeCourseWithDetails({
          status: CourseStatus.CHANGES_REQUESTED,
        }),
      );

      const result = await repository.updateDraftCourse(courseId, {
        title: 'Review Fixes',
        slug: 'review-fixes',
      });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.course.update).toHaveBeenCalledWith({
        where: {
          id: courseId,
          deletedAt: null,
          status: {
            in: [CourseStatus.DRAFT, CourseStatus.CHANGES_REQUESTED],
          },
        },
        data: {
          title: 'Review Fixes',
          slug: 'review-fixes',
          requirements: undefined,
          whatYouWillLearn: undefined,
        },
        include: expect.any(Object),
      });
      expect(result.status).toBe(CourseStatus.CHANGES_REQUESTED);
    });

    it('replaces draft category relations when categoryIds is present', async () => {
      tx.course.update.mockResolvedValue(makeCourseWithDetails());

      await repository.updateDraftCourse(courseId, {
        categoryIds: [categoryId, secondCategoryId],
      });

      expect(tx.courseCategory.deleteMany).toHaveBeenCalledWith({
        where: {
          courseId,
        },
      });
      expect(tx.courseCategory.createMany).toHaveBeenCalledWith({
        data: [
          {
            categoryId,
            courseId,
          },
          {
            categoryId: secondCategoryId,
            courseId,
          },
        ],
      });
    });

    it('does not touch draft categories when categoryIds is omitted', async () => {
      tx.course.update.mockResolvedValue(makeCourseWithDetails());

      await repository.updateDraftCourse(courseId, {
        title: 'No Category Change',
      });

      expect(tx.courseCategory.deleteMany).not.toHaveBeenCalled();
      expect(tx.courseCategory.createMany).not.toHaveBeenCalled();
    });

    it('allows empty draft categoryIds to remove all category links without creating new ones', async () => {
      tx.course.update.mockResolvedValue(makeCourseWithDetails());

      await repository.updateDraftCourse(courseId, {
        categoryIds: [],
      });

      expect(tx.courseCategory.deleteMany).toHaveBeenCalledWith({
        where: {
          courseId,
        },
      });
      expect(tx.courseCategory.createMany).not.toHaveBeenCalled();
    });

    it('strips instructorId and converts JSON fields for draft updates', async () => {
      tx.course.update.mockResolvedValue(
        makeCourseWithDetails({
          whatYouWillLearn: null,
          requirements: ['Need TypeScript'],
        }),
      );

      const result = await repository.updateDraftCourse(courseId, {
        instructorId,
        whatYouWillLearn: null,
        requirements: ['Need TypeScript'],
      });

      expect(tx.course.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            requirements: ['Need TypeScript'],
            whatYouWillLearn: Prisma.JsonNull,
          },
        }),
      );
      expect(tx.course.update.mock.calls[0][0].data).not.toHaveProperty(
        'instructorId',
      );
      expect(result.whatYouWillLearn).toBeNull();
      expect(result.requirements).toEqual(['Need TypeScript']);
    });
  });

  describe('submitForReview', () => {
    it('updates only non-deleted draft or changes-requested courses', async () => {
      tx.course.updateMany.mockResolvedValue({ count: 1 });
      tx.course.findFirst.mockResolvedValue(
        makeCourseWithDetails({
          status: CourseStatus.IN_REVIEW,
          publishedAt: null,
          reviewClaimedById: null,
          reviewClaimedAt: null,
        }),
      );

      const result = await repository.submitForReview(courseId);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.course.updateMany).toHaveBeenCalledWith({
        where: {
          id: courseId,
          deletedAt: null,
          status: {
            in: [CourseStatus.DRAFT, CourseStatus.CHANGES_REQUESTED],
          },
        },
        data: {
          status: CourseStatus.IN_REVIEW,
          publishedAt: null,
          reviewClaimedById: null,
          reviewClaimedAt: null,
        },
      });
      expect(result?.status).toBe(CourseStatus.IN_REVIEW);
      expect(result?.publishedAt).toBeNull();
      expect(result?.reviewClaimedById).toBeNull();
      expect(result?.reviewClaimedAt).toBeNull();
    });

    it('returns null when no eligible course was updated', async () => {
      tx.course.updateMany.mockResolvedValue({ count: 0 });

      const result = await repository.submitForReview(courseId);

      expect(result).toBeNull();
      expect(tx.course.findFirst).not.toHaveBeenCalled();
    });

    it('returns course details after submitting for review', async () => {
      tx.course.updateMany.mockResolvedValue({ count: 1 });
      tx.course.findFirst.mockResolvedValue(
        makeCourseWithDetails({
          status: CourseStatus.IN_REVIEW,
        }),
      );

      const result = await repository.submitForReview(courseId);

      expect(tx.course.findFirst).toHaveBeenCalledWith({
        where: {
          id: courseId,
          deletedAt: null,
        },
        include: expect.any(Object),
      });
      expect(result?.categories).toEqual([
        {
          id: categoryId,
          name: 'Backend',
          slug: 'backend',
        },
      ]);
      expect(result?.instructors).toEqual([
        {
          id: instructorId,
          fullName: 'Instructor One',
        },
      ]);
    });
  });
});

function makeDecimal(value: number): { toNumber: () => number } {
  return {
    toNumber: () => value,
  };
}

function makePrismaCourse(overrides: Record<string, unknown> = {}) {
  const now = new Date('2026-01-01T00:00:00.000Z');

  return {
    id: courseId,
    title: 'NestJS Masterclass',
    slug: 'nestjs-masterclass',
    shortDescription: 'Learn NestJS by building production APIs.',
    description: 'A complete NestJS course.',
    whatYouWillLearn: ['Build APIs'],
    requirements: ['TypeScript basics'],
    thumbnailUrl: 'https://example.com/thumb.jpg',
    cloudinaryPublicId: 'courses/thumb',
    level: CourseLevel.BEGINNER,
    status: CourseStatus.DRAFT,
    price: makeDecimal(49.99),
    language: 'en',
    durationInMinutes: 120,
    isActive: true,
    certificateEnabled: true,
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
}

function makeCourseWithDetails(overrides: Record<string, unknown> = {}) {
  return {
    ...makePrismaCourse(overrides),
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
  };
}
