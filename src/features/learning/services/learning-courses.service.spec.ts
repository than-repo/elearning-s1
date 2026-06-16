jest.mock(
  'generated/prisma/enums',
  () => ({
    MediaTypeEnum: {
      AUDIO: 'AUDIO',
      DOCUMENT: 'DOCUMENT',
      IMAGE: 'IMAGE',
      OTHER: 'OTHER',
      VIDEO: 'VIDEO',
    },
  }),
  { virtual: true },
);

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EnrollmentsService } from '../../enrollments/services/enrollments.service';
import type {
  CourseForLearningModel,
  ILearningCourseRepository,
} from '../interfaces/learning-course.repository.interface';
import { LEARNING_COURSE_REPOSITORY } from '../repositories/learning-course.repository.token';
import { LearningCoursesService } from './learning-courses.service';

type LearningCourseRepositoryMock = jest.Mocked<ILearningCourseRepository>;

const learnerId = '11111111-1111-4111-8111-111111111111';
const courseId = '22222222-2222-4222-8222-222222222222';

describe('LearningCoursesService', () => {
  let service: LearningCoursesService;
  let learningCourseRepository: LearningCourseRepositoryMock;
  let enrollmentsService: jest.Mocked<Pick<EnrollmentsService, 'hasActiveEnrollment'>>;

  beforeEach(async () => {
    learningCourseRepository = {
      findCourseForLearning: jest.fn(),
    };
    enrollmentsService = {
      hasActiveEnrollment: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LearningCoursesService,
        {
          provide: LEARNING_COURSE_REPOSITORY,
          useValue: learningCourseRepository,
        },
        {
          provide: EnrollmentsService,
          useValue: enrollmentsService,
        },
      ],
    }).compile();

    service = module.get(LearningCoursesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('denies learners without a current enrollment', async () => {
    enrollmentsService.hasActiveEnrollment.mockResolvedValue(false);

    await expect(
      service.getCourseForLearning(learnerId, courseId),
    ).rejects.toThrow(ForbiddenException);
    expect(learningCourseRepository.findCourseForLearning).not.toHaveBeenCalled();
  });

  it('throws not found when the learner can access but course content is missing', async () => {
    enrollmentsService.hasActiveEnrollment.mockResolvedValue(true);
    learningCourseRepository.findCourseForLearning.mockResolvedValue(null);

    await expect(
      service.getCourseForLearning(learnerId, courseId),
    ).rejects.toThrow(NotFoundException);
  });

  it('returns only exposed learning fields with nested DTOs', async () => {
    enrollmentsService.hasActiveEnrollment.mockResolvedValue(true);
    learningCourseRepository.findCourseForLearning.mockResolvedValue(
      makeCourseForLearning(),
    );

    const result = await service.getCourseForLearning(learnerId, courseId);

    expect(result).toEqual({
      id: courseId,
      title: 'NestJS Fundamentals',
      slug: 'nestjs-fundamentals',
      shortDescription: 'Build APIs with NestJS.',
      thumbnailUrl: null,
      sections: [
        {
          id: '33333333-3333-4333-8333-333333333333',
          title: 'Getting started',
          description: null,
          sectionIndex: 0,
          lessons: [
            {
              id: '44444444-4444-4444-8444-444444444444',
              title: 'Introduction',
              description: 'Course introduction.',
              lessonIndex: 0,
              files: [
                {
                  id: '55555555-5555-4555-8555-555555555555',
                  url: 'https://example.com/intro.mp4',
                  type: 'VIDEO',
                },
              ],
            },
          ],
        },
      ],
    });
    expect(result).not.toHaveProperty('instructors');
    expect(result).not.toHaveProperty('categories');
    expect(result.sections[0].lessons[0].files[0]).not.toHaveProperty(
      'filename',
    );
  });
});

function makeCourseForLearning(): CourseForLearningModel {
  return {
    id: courseId,
    title: 'NestJS Fundamentals',
    slug: 'nestjs-fundamentals',
    shortDescription: 'Build APIs with NestJS.',
    thumbnailUrl: null,
    sections: [
      {
        id: '33333333-3333-4333-8333-333333333333',
        title: 'Getting started',
        description: null,
        sectionIndex: 0,
        lessons: [
          {
            id: '44444444-4444-4444-8444-444444444444',
            title: 'Introduction',
            description: 'Course introduction.',
            lessonIndex: 0,
            files: [
              {
                id: '55555555-5555-4555-8555-555555555555',
                url: 'https://example.com/intro.mp4',
                type: 'VIDEO',
                filename: 'intro.mp4',
              },
            ],
          },
        ],
      },
    ],
    instructors: [],
    categories: [],
  } as CourseForLearningModel;
}
