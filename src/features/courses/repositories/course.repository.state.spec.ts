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

import { CourseStatus } from 'generated/prisma/client';
import { CourseLevel } from 'generated/prisma/enums';

import { CourseRepository } from './course.repository';

type PrismaServiceMock = {
  course: {
    update: jest.Mock;
  };
};

const courseId = '11111111-1111-4111-8111-111111111111';

describe('CourseRepository state changes', () => {
  let repository: CourseRepository;
  let prisma: PrismaServiceMock;

  beforeEach(() => {
    prisma = {
      course: {
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

  it('softDelete marks the course deleted and inactive', async () => {
    const deletedAt = new Date('2026-01-01T00:00:00.000Z');
    prisma.course.update.mockResolvedValue(
      makePrismaCourse({
        deletedAt,
        isActive: false,
      }),
    );

    const result = await repository.softDelete(courseId);

    expect(prisma.course.update).toHaveBeenCalledWith({
      where: {
        id: courseId,
      },
      data: {
        deletedAt: expect.any(Date),
        isActive: false,
      },
    });
    expect(result.deletedAt).toBe(deletedAt);
    expect(result.isActive).toBe(false);
  });

  it('restore clears deletedAt without changing other state', async () => {
    prisma.course.update.mockResolvedValue(
      makePrismaCourse({
        deletedAt: null,
        isActive: false,
      }),
    );

    const result = await repository.restore(courseId);

    expect(prisma.course.update).toHaveBeenCalledWith({
      where: {
        id: courseId,
      },
      data: {
        deletedAt: null,
      },
    });
    expect(result.deletedAt).toBeNull();
    expect(result.isActive).toBe(false);
  });

  it('publish marks the course published, active, and sets publishedAt', async () => {
    const publishedAt = new Date('2026-01-02T00:00:00.000Z');
    prisma.course.update.mockResolvedValue(
      makePrismaCourse({
        status: CourseStatus.PUBLISHED,
        isActive: true,
        publishedAt,
      }),
    );

    const result = await repository.publish(courseId);

    expect(prisma.course.update).toHaveBeenCalledWith({
      where: {
        id: courseId,
      },
      data: {
        publishedAt: expect.any(Date),
        status: CourseStatus.PUBLISHED,
        isActive: true,
      },
    });
    expect(result.status).toBe(CourseStatus.PUBLISHED);
    expect(result.isActive).toBe(true);
    expect(result.publishedAt).toBe(publishedAt);
  });

  it('unpublish returns the course to draft and clears publishedAt', async () => {
    prisma.course.update.mockResolvedValue(
      makePrismaCourse({
        status: CourseStatus.DRAFT,
        publishedAt: null,
      }),
    );

    const result = await repository.unpublish(courseId);

    expect(prisma.course.update).toHaveBeenCalledWith({
      where: {
        id: courseId,
      },
      data: {
        status: CourseStatus.DRAFT,
        publishedAt: null,
      },
    });
    expect(result.status).toBe(CourseStatus.DRAFT);
    expect(result.publishedAt).toBeNull();
  });

  it('maps returned Prisma course state into CourseModel values', async () => {
    prisma.course.update.mockResolvedValue(
      makePrismaCourse({
        price: makeDecimal(19.5),
        whatYouWillLearn: ['Learn NestJS', 123],
        requirements: ['Know TypeScript', false],
      }),
    );

    const result = await repository.restore(courseId);

    expect(result).toEqual(
      expect.objectContaining({
        id: courseId,
        price: 19.5,
        whatYouWillLearn: ['Learn NestJS'],
        requirements: ['Know TypeScript'],
      }),
    );
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
