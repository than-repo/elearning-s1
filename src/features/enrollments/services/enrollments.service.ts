import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { EnrollmentStatus, PaymentMethod } from 'generated/prisma/enums';
import { PaginatedResponse } from '../../courses/dtos/paginated-response.dto';
import {
  EnrollmentResponseDto,
  EnrollmentStatusResponseDto,
} from '../dtos/enrollment-response.dto';
import type {
  ActivateEnrollmentByPaymentInput,
  EnrollableCourseModel,
  EnrollmentModel,
  IEnrollmentRepository,
} from '../interfaces/enrollment.repository.interface';
import { ENROLLMENT_REPOSITORY } from '../repositories/enrollment-repository.token';

const DEFAULT_ENROLLMENT_LIMIT = 10;
const MAX_ENROLLMENT_LIMIT = 50;

@Injectable()
export class EnrollmentsService {
  constructor(
    @Inject(ENROLLMENT_REPOSITORY)
    private readonly enrollmentRepository: IEnrollmentRepository,
  ) {}

  private toEnrollmentResponse(
    enrollment: EnrollmentModel,
  ): EnrollmentResponseDto {
    return plainToInstance(EnrollmentResponseDto, enrollment, {
      excludeExtraneousValues: true,
    });
  }
  async enrollInCourse(
    userId: string,
    courseId: string,
  ): Promise<EnrollmentResponseDto> {
    const course =
      await this.enrollmentRepository.findEnrollableCourseById(courseId);

    if (!course) {
      throw new NotFoundException('COURSE_NOT_FOUND_OR_NOT_ENROLLABLE');
    }

    const enrollment = await this.enrollmentRepository.enrollLearner({
      userId,
      courseId,
      payment: this.buildPaymentInput(course),
    });

    return this.toEnrollmentResponse(enrollment);
  }

  async findMyEnrollments(
    userId: string,
    query: { limit?: number; page?: number },
  ): Promise<PaginatedResponse<EnrollmentResponseDto>> {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(
      Math.max(query.limit ?? DEFAULT_ENROLLMENT_LIMIT, 1),
      MAX_ENROLLMENT_LIMIT,
    );
    const offset = (page - 1) * limit;

    const [enrollments, total] = await Promise.all([
      this.enrollmentRepository.findManyByUser({
        userId,
        limit,
        offset,
      }),
      this.enrollmentRepository.countByUser(userId),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: enrollments.map((enrollment) =>
        this.toEnrollmentResponse(enrollment),
      ),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  //use inside LearningCoursesService
  async findByCourseIdAndUserId(
    userId: string,
    courseId: string,
  ): Promise<EnrollmentResponseDto | null> {
    const enrollment = await this.enrollmentRepository.findByUserAndCourse(
      userId,
      courseId,
    );

    if (!enrollment || !this.isEnrolled(enrollment)) {
      return null;
    }

    return this.toEnrollmentResponse(enrollment);
  }
  async hasActiveEnrollment(
    userId: string,
    courseId: string,
  ): Promise<boolean> {
    const enrollment = await this.enrollmentRepository.findByUserAndCourse(
      userId,
      courseId,
    );

    return this.isEnrolled(enrollment);
  }

  //use inside Payment Service
  async activateByPaidPayment(
    input: ActivateEnrollmentByPaymentInput,
  ): Promise<EnrollmentModel> {
    return this.enrollmentRepository.activateByPaidPayment(input);
  }

  async getCourseEnrollmentStatus(
    userId: string,
    courseId: string,
  ): Promise<EnrollmentStatusResponseDto> {
    const enrollment = await this.enrollmentRepository.findByUserAndCourse(
      userId,
      courseId,
    );

    const enrolled = this.isEnrolled(enrollment);

    return plainToInstance(
      EnrollmentStatusResponseDto,
      {
        enrolled,
        enrollment:
          enrolled && enrollment ? this.toEnrollmentResponse(enrollment) : null,
      },
      {
        excludeExtraneousValues: true,
      },
    );
  }

  private buildPaymentInput(course: EnrollableCourseModel) {
    if (course.price === null || course.price <= 0) {
      return undefined;
    }

    return {
      amount: course.price,
      currency: 'VND',
      paymentMethod: PaymentMethod.SIMULATION,
      provider: 'SIMULATION',
    };
  }

  private isEnrolled(enrollment: EnrollmentModel | null): boolean {
    return (
      enrollment !== null &&
      enrollment.isActive &&
      enrollment.deletedAt === null &&
      (enrollment.status === EnrollmentStatus.ACTIVE ||
        enrollment.status === EnrollmentStatus.COMPLETED)
    );
  }
}
