jest.mock(
  'generated/prisma/enums',
  () => ({
    CourseLevel: {
      BEGINNER: 'BEGINNER',
      INTERMEDIATE: 'INTERMEDIATE',
      ADVANCE: 'ADVANCE',
      ALL_LEVELS: 'ALL_LEVELS',
    },
    EnrollmentStatus: {
      ACTIVE: 'ACTIVE',
      COMPLETED: 'COMPLETED',
      CANCELLED: 'CANCELLED',
      EXPIRED: 'EXPIRED',
    },
    PaymentMethod: {
      CREDIT_CARD: 'CREDIT_CARD',
      BANK_TRANSFER: 'BANK_TRANSFER',
      E_WALLET: 'E_WALLET',
      PAYPAL: 'PAYPAL',
      VN_PAY: 'VN_PAY',
      FREE: 'FREE',
    },
    PaymentStatus: {
      PENDING: 'PENDING',
      COMPLETED: 'COMPLETED',
      FAILED: 'FAILED',
      REFUNDED: 'REFUNDED',
      CANCELLED: 'CANCELLED',
    },
  }),
  { virtual: true },
);

import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  CourseLevel,
  EnrollmentStatus,
  PaymentMethod,
  PaymentStatus,
} from 'generated/prisma/enums';
import type {
  EnrollmentModel,
  IEnrollmentRepository,
} from '../interfaces/enrollment.repository.interface';
import { ENROLLMENT_REPOSITORY } from '../repositories/enrollment-repository.token';
import { EnrollmentsService } from './enrollments.service';

type EnrollmentRepositoryMock = jest.Mocked<IEnrollmentRepository>;

const userId = '11111111-1111-4111-8111-111111111111';
const courseId = '22222222-2222-4222-8222-222222222222';

describe('EnrollmentsService', () => {
  let service: EnrollmentsService;
  let enrollmentRepository: EnrollmentRepositoryMock;

  beforeEach(async () => {
    enrollmentRepository = createEnrollmentRepositoryMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnrollmentsService,
        {
          provide: ENROLLMENT_REPOSITORY,
          useValue: enrollmentRepository,
        },
      ],
    }).compile();

    service = module.get(EnrollmentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('enrollInCourse', () => {
    it('creates a completed mock payment input for paid courses', async () => {
      const enrollment = makeEnrollment({
        payment: makePayment(),
      });
      enrollmentRepository.findEnrollableCourseById.mockResolvedValue({
        id: courseId,
        price: 150000,
      });
      enrollmentRepository.enrollLearner.mockResolvedValue(enrollment);

      const result = await service.enrollInCourse(userId, courseId);

      expect(enrollmentRepository.enrollLearner).toHaveBeenCalledWith({
        userId,
        courseId,
        payment: {
          amount: 150000,
          currency: 'VND',
          paymentMethod: PaymentMethod.VN_PAY,
          provider: 'mock',
        },
      });
      expect(result).toMatchObject({
        id: enrollment.id,
        courseId,
        payment: {
          id: enrollment.payment?.id,
          status: PaymentStatus.COMPLETED,
        },
      });
      expect(result).not.toHaveProperty('userId');
      expect(result).not.toHaveProperty('paymentId');
    });

    it('enrolls free courses without payment input', async () => {
      const enrollment = makeEnrollment({
        payment: null,
      });
      enrollmentRepository.findEnrollableCourseById.mockResolvedValue({
        id: courseId,
        price: 0,
      });
      enrollmentRepository.enrollLearner.mockResolvedValue(enrollment);

      const result = await service.enrollInCourse(userId, courseId);

      expect(enrollmentRepository.enrollLearner).toHaveBeenCalledWith({
        userId,
        courseId,
        payment: undefined,
      });
      expect(result.payment).toBeNull();
    });

    it('returns existing enrollment from repository for repeat clicks', async () => {
      const existingEnrollment = makeEnrollment({
        status: EnrollmentStatus.COMPLETED,
      });
      enrollmentRepository.findEnrollableCourseById.mockResolvedValue({
        id: courseId,
        price: 99,
      });
      enrollmentRepository.enrollLearner.mockResolvedValue(existingEnrollment);

      const result = await service.enrollInCourse(userId, courseId);

      expect(result).toMatchObject({
        id: existingEnrollment.id,
        status: EnrollmentStatus.COMPLETED,
      });
    });

    it('throws when course is missing or not enrollable', async () => {
      enrollmentRepository.findEnrollableCourseById.mockResolvedValue(null);

      await expect(service.enrollInCourse(userId, courseId)).rejects.toThrow(
        NotFoundException,
      );
      expect(enrollmentRepository.enrollLearner).not.toHaveBeenCalled();
    });
  });

  describe('findMyEnrollments', () => {
    it('returns learner enrollments with pagination metadata', async () => {
      enrollmentRepository.findManyByUser.mockResolvedValue([makeEnrollment()]);
      enrollmentRepository.countByUser.mockResolvedValue(11);

      const result = await service.findMyEnrollments(userId, {
        page: 2,
        limit: 10,
      });

      expect(enrollmentRepository.findManyByUser).toHaveBeenCalledWith({
        userId,
        limit: 10,
        offset: 10,
      });
      expect(result.meta).toEqual({
        page: 2,
        limit: 10,
        total: 11,
        totalPages: 2,
        hasNextPage: false,
        hasPreviousPage: true,
      });
    });
  });

  describe('getCourseEnrollmentStatus', () => {
    it('returns enrolled true for active enrollment', async () => {
      enrollmentRepository.findByUserAndCourse.mockResolvedValue(
        makeEnrollment(),
      );

      const result = await service.getCourseEnrollmentStatus(userId, courseId);

      expect(result).toMatchObject({
        enrolled: true,
        enrollment: {
          courseId,
          status: EnrollmentStatus.ACTIVE,
        },
      });
    });

    it('returns enrolled false for cancelled enrollment', async () => {
      enrollmentRepository.findByUserAndCourse.mockResolvedValue(
        makeEnrollment({
          status: EnrollmentStatus.CANCELLED,
        }),
      );

      const result = await service.getCourseEnrollmentStatus(userId, courseId);

      expect(result).toEqual({
        enrolled: false,
        enrollment: null,
      });
    });
  });

  describe('hasActiveEnrollment', () => {
    it('allows active and completed current enrollments', async () => {
      enrollmentRepository.findByUserAndCourse
        .mockResolvedValueOnce(makeEnrollment())
        .mockResolvedValueOnce(
          makeEnrollment({
            status: EnrollmentStatus.COMPLETED,
          }),
        );

      await expect(
        service.hasActiveEnrollment(userId, courseId),
      ).resolves.toBe(true);
      await expect(
        service.hasActiveEnrollment(userId, courseId),
      ).resolves.toBe(true);
    });

    it('denies inactive, soft-deleted, and cancelled enrollments', async () => {
      enrollmentRepository.findByUserAndCourse
        .mockResolvedValueOnce(
          makeEnrollment({
            isActive: false,
          }),
        )
        .mockResolvedValueOnce(
          makeEnrollment({
            deletedAt: new Date('2026-06-13T00:00:00.000Z'),
          }),
        )
        .mockResolvedValueOnce(
          makeEnrollment({
            status: EnrollmentStatus.CANCELLED,
          }),
        );

      await expect(
        service.hasActiveEnrollment(userId, courseId),
      ).resolves.toBe(false);
      await expect(
        service.hasActiveEnrollment(userId, courseId),
      ).resolves.toBe(false);
      await expect(
        service.hasActiveEnrollment(userId, courseId),
      ).resolves.toBe(false);
    });
  });
});

function createEnrollmentRepositoryMock(): EnrollmentRepositoryMock {
  return {
    countByUser: jest.fn(),
    enrollLearner: jest.fn(),
    findByUserAndCourse: jest.fn(),
    findEnrollableCourseById: jest.fn(),
    findManyByUser: jest.fn(),
  };
}

function makeEnrollment(
  overrides: Partial<EnrollmentModel> = {},
): EnrollmentModel {
  const now = new Date('2026-06-12T00:00:00.000Z');

  return {
    id: '33333333-3333-4333-8333-333333333333',
    userId,
    courseId,
    paymentId: null,
    status: EnrollmentStatus.ACTIVE,
    progressPercentage: 0,
    enrolledAt: now,
    completedAt: null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    course: {
      id: courseId,
      title: 'NestJS Fundamentals',
      slug: 'nestjs-fundamentals',
      shortDescription: 'Build APIs with NestJS.',
      thumbnailUrl: null,
      level: CourseLevel.BEGINNER,
      price: 150000,
    },
    payment: null,
    ...overrides,
  };
}

function makePayment() {
  return {
    id: '44444444-4444-4444-8444-444444444444',
    amount: 150000,
    currency: 'VND',
    paymentMethod: PaymentMethod.VN_PAY,
    status: PaymentStatus.COMPLETED,
    createdAt: new Date('2026-06-12T00:00:00.000Z'),
  };
}
