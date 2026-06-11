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

type CourseDelegateMock = {
  create: jest.Mock;
};

type TransactionClientMock = {
  course: CourseDelegateMock;
};

type PrismaServiceMock = {
  course: CourseDelegateMock;
  $transaction: jest.Mock;
};

const courseId = '11111111-1111-4111-8111-111111111111';
const instructorId = '22222222-2222-4222-8222-222222222222';
const categoryId = '33333333-3333-4333-8333-333333333333';
const secondCategoryId = '44444444-4444-4444-8444-444444444444';

describe('CourseRepository create behavior', () => {
  let repository: CourseRepository;
  let prisma: PrismaServiceMock;
  let tx: TransactionClientMock;

  beforeEach(() => {
    tx = {
      course: {
        create: jest.fn(),
      },
    };

    prisma = {
      course: {
        create: jest.fn(),
      },
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

  describe('create', () => {
    it('creates a course with category relations and does not spread categoryIds into scalar data', async () => {
      prisma.course.create.mockResolvedValue(makeCourseWithDetails());

      const result = await repository.create({
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
        price: 49.99,
        language: 'en',
        durationInMinutes: 120,
        isActive: true,
        certificateEnabled: true,
        publishedAt: null,
        categoryIds: [categoryId, secondCategoryId],
      });

      expect(prisma.course.create).toHaveBeenCalledWith({
        data: {
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
          price: 49.99,
          language: 'en',
          durationInMinutes: 120,
          isActive: true,
          certificateEnabled: true,
          publishedAt: null,
          courseCategories: {
            create: [
              {
                categoryId,
              },
              {
                categoryId: secondCategoryId,
              },
            ],
          },
        },
        include: expect.any(Object),
      });
      expect(prisma.course.create.mock.calls[0][0].data).not.toHaveProperty(
        'categoryIds',
      );
      expect(result).toEqual(
        expect.objectContaining({
          id: courseId,
          price: 49.99,
          whatYouWillLearn: ['Build APIs'],
          requirements: ['TypeScript basics'],
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
        }),
      );
    });

    it('converts null JSON array fields to Prisma JsonNull', async () => {
      prisma.course.create.mockResolvedValue(
        makeCourseWithDetails({
          whatYouWillLearn: null,
          requirements: null,
        }),
      );

      await repository.create({
        title: 'NestJS Masterclass',
        slug: 'nestjs-masterclass',
        shortDescription: 'Learn NestJS by building production APIs.',
        description: null,
        whatYouWillLearn: null,
        requirements: null,
        level: CourseLevel.BEGINNER,
        categoryIds: [categoryId],
      });

      expect(prisma.course.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            whatYouWillLearn: Prisma.JsonNull,
            requirements: Prisma.JsonNull,
          }),
        }),
      );
    });

    it('leaves undefined JSON fields undefined so Prisma can ignore them', async () => {
      prisma.course.create.mockResolvedValue(makeCourseWithDetails());

      await repository.create({
        title: 'NestJS Masterclass',
        slug: 'nestjs-masterclass',
        shortDescription: 'Learn NestJS by building production APIs.',
        level: CourseLevel.BEGINNER,
        categoryIds: [categoryId],
      });

      expect(prisma.course.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            whatYouWillLearn: undefined,
            requirements: undefined,
          }),
        }),
      );
    });
  });

  describe('createDraftCourse', () => {
    it('creates a draft course inside a transaction with instructor and category relations', async () => {
      tx.course.create.mockResolvedValue(
        makeCourseWithDetails({
          status: CourseStatus.DRAFT,
          isActive: true,
        }),
      );

      const result = await repository.createDraftCourse({
        title: 'NestJS Masterclass',
        slug: 'nestjs-masterclass',
        shortDescription: 'Learn NestJS by building production APIs.',
        description: 'A complete NestJS course.',
        whatYouWillLearn: ['Build APIs'],
        requirements: ['TypeScript basics'],
        level: CourseLevel.BEGINNER,
        price: 49.99,
        language: 'en',
        certificateEnabled: true,
        status: CourseStatus.DRAFT,
        instructorId,
        categoryIds: [categoryId, secondCategoryId],
      });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.course.create).toHaveBeenCalledWith({
        data: {
          title: 'NestJS Masterclass',
          slug: 'nestjs-masterclass',
          shortDescription: 'Learn NestJS by building production APIs.',
          description: 'A complete NestJS course.',
          whatYouWillLearn: ['Build APIs'],
          requirements: ['TypeScript basics'],
          level: CourseLevel.BEGINNER,
          price: 49.99,
          language: 'en',
          certificateEnabled: true,
          status: CourseStatus.DRAFT,
          isActive: true,
          instructors: {
            create: {
              instructorId,
              isPrimary: true,
              order: 0,
              isActive: true,
            },
          },
          courseCategories: {
            create: [
              {
                categoryId,
              },
              {
                categoryId: secondCategoryId,
              },
            ],
          },
        },
        include: expect.any(Object),
      });
      expect(result).toEqual(
        expect.objectContaining({
          id: courseId,
          status: CourseStatus.DRAFT,
          isActive: true,
          price: 49.99,
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
        }),
      );
    });

    it('converts draft JSON arrays to JsonNull when null is supplied', async () => {
      tx.course.create.mockResolvedValue(
        makeCourseWithDetails({
          whatYouWillLearn: null,
          requirements: null,
        }),
      );

      await repository.createDraftCourse({
        title: 'NestJS Masterclass',
        slug: 'nestjs-masterclass',
        shortDescription: 'Learn NestJS by building production APIs.',
        description: undefined,
        whatYouWillLearn: null as unknown as string[],
        requirements: null as unknown as string[],
        level: CourseLevel.BEGINNER,
        status: CourseStatus.DRAFT,
        instructorId,
        categoryIds: [categoryId],
      });

      expect(tx.course.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            whatYouWillLearn: Prisma.JsonNull,
            requirements: Prisma.JsonNull,
          }),
        }),
      );
    });

    it('maps invalid JSON array values to string arrays only', async () => {
      tx.course.create.mockResolvedValue(
        makeCourseWithDetails({
          whatYouWillLearn: ['Build APIs', 123, null],
          requirements: ['Know TypeScript', false],
        }),
      );

      const result = await repository.createDraftCourse({
        title: 'NestJS Masterclass',
        slug: 'nestjs-masterclass',
        shortDescription: 'Learn NestJS by building production APIs.',
        level: CourseLevel.BEGINNER,
        status: CourseStatus.DRAFT,
        instructorId,
        categoryIds: [categoryId],
      });

      expect(result.whatYouWillLearn).toEqual(['Build APIs']);
      expect(result.requirements).toEqual(['Know TypeScript']);
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
