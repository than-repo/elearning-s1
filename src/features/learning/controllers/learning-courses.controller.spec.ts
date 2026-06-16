jest.mock(
  'generated/prisma/enums',
  () => ({
    UserRole: {
      LEARNER: 'LEARNER',
    },
  }),
  { virtual: true },
);

jest.mock(
  'src/common/decorators/current-user.decorator',
  () => ({
    CurrentUser: () => () => undefined,
  }),
  { virtual: true },
);

jest.mock(
  'src/features/auth/decorators/roles.decorator',
  () => ({
    Roles: () => () => undefined,
  }),
  { virtual: true },
);

jest.mock(
  'src/features/auth/guards/jwt-auth.guard',
  () => ({
    JwtAuthGuard: class JwtAuthGuard {},
  }),
  { virtual: true },
);

jest.mock(
  'src/features/auth/guards/roles.guard',
  () => ({
    RolesGuard: class RolesGuard {},
  }),
  { virtual: true },
);

import { Test, TestingModule } from '@nestjs/testing';
import { CourseLearningResponseDto } from '../dtos/course-learner-response.dto';
import { LearningCoursesService } from '../services/learning-courses.service';
import { LearnerCoursesController } from './learning-courses.controller';

const learnerId = '11111111-1111-4111-8111-111111111111';
const courseId = '22222222-2222-4222-8222-222222222222';

describe('LearnerCoursesController', () => {
  let controller: LearnerCoursesController;
  let learningCoursesService: jest.Mocked<
    Pick<LearningCoursesService, 'getCourseForLearning'>
  >;

  beforeEach(async () => {
    learningCoursesService = {
      getCourseForLearning: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LearnerCoursesController],
      providers: [
        {
          provide: LearningCoursesService,
          useValue: learningCoursesService,
        },
      ],
    }).compile();

    controller = module.get(LearnerCoursesController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('delegates learning detail requests to the service', async () => {
    const response = {
      id: courseId,
      title: 'NestJS Fundamentals',
      slug: 'nestjs-fundamentals',
      shortDescription: 'Build APIs with NestJS.',
      thumbnailUrl: null,
      sections: [],
    } satisfies CourseLearningResponseDto;
    learningCoursesService.getCourseForLearning.mockResolvedValue(response);

    await expect(
      controller.getCourseForLearning(learnerId, courseId),
    ).resolves.toBe(response);
    expect(learningCoursesService.getCourseForLearning).toHaveBeenCalledWith(
      learnerId,
      courseId,
    );
  });
});
