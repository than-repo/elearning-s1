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
  'src/core/database/prisma.service',
  () => ({
    PrismaService: class PrismaService {},
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

import { CourseStatus } from 'generated/prisma/client';
import { CourseLevel } from 'generated/prisma/enums';

import { CourseRepository } from './course.repository';

type CourseDelegateMock = {
  findMany: jest.Mock;
  findFirst: jest.Mock;
  count: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
};

type PrismaServiceMock = {
  course: CourseDelegateMock;
};

const courseId = '11111111-1111-4111-8111-111111111111';
const instructorId = '22222222-2222-4222-8222-222222222222';
const categoryId = '33333333-3333-4333-8333-333333333333';

describe('CourseRepository read queries', () => {
  let repository: CourseRepository;
  let prisma: PrismaServiceMock;

  beforeEach(() => {
    prisma = {
      course: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    repository = new CourseRepository(
      prisma as unknown as ConstructorParameters<typeof CourseRepository>[0],
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('findMany uses safe defaults, relation include filters, and maps course details', async () => {
    prisma.course.findMany.mockResolvedValue([
      makeCourseWithDetails({
        price: makeDecimal(49.99),
        whatYouWillLearn: ['Build APIs', 123],
        requirements: null,
      }),
    ]);

    const result = await repository.findMany();

    expect(prisma.course.findMany).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: undefined,
      skip: undefined,
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
        instructors: {
          where: {
            deletedAt: null,
            isActive: true,
            instructor: {
              isActive: true,
            },
          },
          include: {
            instructor: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
      }),
    });
    expect(result).toEqual([
      expect.objectContaining({
        id: courseId,
        price: 49.99,
        whatYouWillLearn: ['Build APIs'],
        requirements: null,
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
    ]);
  });

  it('findMany builds all common filters, custom ordering, and pagination', async () => {
    const publishedFrom = new Date('2026-01-01T00:00:00.000Z');
    const publishedTo = new Date('2026-02-01T00:00:00.000Z');
    prisma.course.findMany.mockResolvedValue([]);

    await repository.findMany({
      where: {
        search: 'nestjs',
        level: CourseLevel.BEGINNER,
        status: CourseStatus.PUBLISHED,
        isActive: true,
        certificateEnabled: true,
        categoryId,
        instructorId,
        minPrice: 10,
        maxPrice: 100,
        language: 'en',
        publishedFrom,
        publishedTo,
      },
      orderBy: {
        field: 'price',
        direction: 'asc',
      },
      limit: 20,
      offset: 40,
    });

    expect(prisma.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          deletedAt: null,
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
          ],
          level: CourseLevel.BEGINNER,
          status: CourseStatus.PUBLISHED,
          isActive: true,
          certificateEnabled: true,
          courseCategories: {
            some: {
              categoryId,
              category: {
                deletedAt: null,
                isActive: true,
              },
            },
          },
          instructors: {
            some: {
              instructorId,
              deletedAt: null,
              isActive: true,
            },
          },
          price: {
            gte: 10,
            lte: 100,
          },
          language: 'en',
          publishedAt: {
            gte: publishedFrom,
            lt: publishedTo,
          },
        },
        orderBy: {
          price: 'asc',
        },
        take: 20,
        skip: 40,
      }),
    );
  });

  it('findMany supports explicit publishedAt ordering', async () => {
    prisma.course.findMany.mockResolvedValue([]);

    await repository.findMany({
      orderBy: {
        field: 'publishedAt',
        direction: 'desc',
      },
    });

    expect(prisma.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: {
          publishedAt: 'desc',
        },
      }),
    );
  });

  it('findById reads only non-deleted courses with safe details include', async () => {
    prisma.course.findFirst.mockResolvedValue(makeCourseWithDetails());

    const result = await repository.findById(courseId);

    expect(prisma.course.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: courseId,
          deletedAt: null,
        },
        include: expect.any(Object),
      }),
    );
    expect(result?.id).toBe(courseId);
    expect(result?.categories).toEqual([
      {
        id: categoryId,
        name: 'Backend',
        slug: 'backend',
      },
    ]);
  });

  it('findById returns null when Prisma finds nothing', async () => {
    prisma.course.findFirst.mockResolvedValue(null);

    await expect(repository.findById(courseId)).resolves.toBeNull();
  });

  it('findActiveById requires a non-deleted active course', async () => {
    prisma.course.findFirst.mockResolvedValue(makeCourseWithDetails());

    await repository.findActiveById(courseId);

    expect(prisma.course.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: courseId,
          deletedAt: null,
          isActive: true,
        },
      }),
    );
  });

  it('findBySlug only reads public visible courses', async () => {
    prisma.course.findFirst.mockResolvedValue(
      makeCourseWithDetails({
        status: CourseStatus.PUBLISHED,
      }),
    );

    const result = await repository.findBySlug('nestjs-masterclass');

    expect(prisma.course.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          slug: 'nestjs-masterclass',
          deletedAt: null,
          isActive: true,
          status: CourseStatus.PUBLISHED,
        },
      }),
    );
    expect(result?.status).toBe(CourseStatus.PUBLISHED);
  });

  it('count uses the same filter builder as findMany', async () => {
    prisma.course.count.mockResolvedValue(2);

    const result = await repository.count({
      categoryId,
      instructorId,
      certificateEnabled: false,
      minPrice: 0,
    });

    expect(prisma.course.count).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        certificateEnabled: false,
        courseCategories: {
          some: {
            categoryId,
            category: {
              deletedAt: null,
              isActive: true,
            },
          },
        },
        instructors: {
          some: {
            instructorId,
            deletedAt: null,
            isActive: true,
          },
        },
        price: {
          gte: 0,
        },
      },
    });
    expect(result).toBe(2);
  });

  it('existsBySlug ignores soft-deleted rows and can exclude the current course', async () => {
    prisma.course.count.mockResolvedValue(1);

    const result = await repository.existsBySlug(
      'nestjs-masterclass',
      courseId,
    );

    expect(prisma.course.count).toHaveBeenCalledWith({
      where: {
        slug: 'nestjs-masterclass',
        deletedAt: null,
        id: {
          not: courseId,
        },
      },
    });
    expect(result).toBe(true);
  });

  it('existsOwnedByInstructor requires active course and active non-deleted instructor relation', async () => {
    prisma.course.count.mockResolvedValue(0);

    const result = await repository.existsOwnedByInstructor(
      courseId,
      instructorId,
    );

    expect(prisma.course.count).toHaveBeenCalledWith({
      where: {
        id: courseId,
        deletedAt: null,
        isActive: true,
        instructors: {
          some: {
            instructorId,
            isActive: true,
            deletedAt: null,
          },
        },
      },
    });
    expect(result).toBe(false);
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
