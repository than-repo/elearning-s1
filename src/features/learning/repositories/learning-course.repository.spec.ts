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
    CourseStatus: {
      PUBLISHED: 'PUBLISHED',
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

import { CourseStatus } from 'generated/prisma/enums';
import { LearningCourseRepository } from './learning-course.repository';

type PrismaServiceMock = {
  course: {
    findFirst: jest.Mock;
  };
};

const courseId = '22222222-2222-4222-8222-222222222222';

describe('LearningCourseRepository', () => {
  let repository: LearningCourseRepository;
  let prisma: PrismaServiceMock;

  beforeEach(() => {
    prisma = {
      course: {
        findFirst: jest.fn(),
      },
    };

    repository = new LearningCourseRepository(
      prisma as unknown as ConstructorParameters<
        typeof LearningCourseRepository
      >[0],
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('findCourseForLearning scopes content to published active courses', async () => {
    prisma.course.findFirst.mockResolvedValue({
      id: courseId,
      title: 'NestJS Fundamentals',
      slug: 'nestjs-fundamentals',
      shortDescription: 'Build APIs with NestJS.',
      thumbnailUrl: null,
      sections: [],
    });

    await repository.findCourseForLearning(courseId);

    expect(prisma.course.findFirst).toHaveBeenCalledWith({
      where: {
        id: courseId,
        deletedAt: null,
        isActive: true,
        status: CourseStatus.PUBLISHED,
      },
      include: expect.objectContaining({
        sections: expect.objectContaining({
          where: {
            isActive: true,
            deletedAt: null,
          },
        }),
      }),
    });
  });
});
