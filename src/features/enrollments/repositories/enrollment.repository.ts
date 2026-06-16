import { Injectable } from '@nestjs/common';
import { Prisma, type Enrollment } from 'generated/prisma/client';
import {
  CourseStatus,
  EnrollmentStatus,
  PaymentStatus,
} from 'generated/prisma/enums';
import { PrismaService } from 'src/core/database/prisma.service';
import type {
  EnrollableCourseModel,
  EnrollmentModel,
  EnrollLearnerInput,
  FindMyEnrollmentsParams,
  IEnrollmentRepository,
  PaymentModel,
  ActivateEnrollmentByPaymentInput,
} from '../interfaces/enrollment.repository.interface';

const enrollmentInclude = {
  course: {
    select: {
      id: true,
      title: true,
      slug: true,
      shortDescription: true,
      thumbnailUrl: true,
      level: true,
      price: true,
    },
  },
  payment: {
    select: {
      id: true,
      amount: true,
      currency: true,
      paymentMethod: true,
      status: true,
      createdAt: true,
    },
  },
} satisfies Prisma.EnrollmentInclude;

type PrismaEnrollmentWithDetails = Prisma.EnrollmentGetPayload<{
  include: typeof enrollmentInclude;
}>;

@Injectable()
export class EnrollmentRepository implements IEnrollmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findEnrollableCourseById(
    courseId: string,
  ): Promise<EnrollableCourseModel | null> {
    const course = await this.prisma.course.findFirst({
      where: {
        id: courseId,
        status: CourseStatus.PUBLISHED,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        price: true,
      },
    });

    if (!course) {
      return null;
    }

    return {
      id: course.id,
      price: course.price?.toNumber() ?? null,
    };
  }

  async enrollLearner(input: EnrollLearnerInput): Promise<EnrollmentModel> {
    try {
      const enrollment = await this.prisma.$transaction(async (tx) => {
        const existing = await tx.enrollment.findUnique({
          where: {
            userId_courseId: {
              userId: input.userId,
              courseId: input.courseId,
            },
          },
          include: enrollmentInclude,
        });

        if (existing && this.isCurrentEnrollment(existing)) {
          return existing;
        }

        if (existing) {
          return this.reactivateEnrollment(tx, existing, input);
        }

        return this.createEnrollment(tx, input);
      });

      return this.toEnrollmentModel(enrollment);
    } catch (error) {
      if (this.isUniqueEnrollmentConflict(error)) {
        const enrollment = await this.findByUserAndCourse(
          input.userId,
          input.courseId,
        );

        if (enrollment) {
          return enrollment;
        }
      }

      throw error;
    }
  }

  async activateByPaidPayment(
    input: ActivateEnrollmentByPaymentInput,
  ): Promise<EnrollmentModel> {
    try {
      const enrollment = await this.prisma.$transaction(async (tx) => {
        const existing = await tx.enrollment.findUnique({
          where: {
            userId_courseId: {
              userId: input.userId,
              courseId: input.courseId,
            },
          },
          include: enrollmentInclude,
        });

        const now = new Date();

        if (!existing) {
          return tx.enrollment.create({
            data: {
              userId: input.userId,
              courseId: input.courseId,
              paymentId: input.paymentId,
              status: EnrollmentStatus.ACTIVE,
              enrolledAt: now,
              isActive: true,
            },
            include: enrollmentInclude,
          });
        }

        if (this.isCurrentEnrollment(existing)) {
          return tx.enrollment.update({
            where: {
              id: existing.id,
            },
            data: {
              paymentId: input.paymentId,
            },
            include: enrollmentInclude,
          });
        }

        return tx.enrollment.update({
          where: {
            id: existing.id,
          },
          data: {
            status: EnrollmentStatus.ACTIVE,
            paymentId: input.paymentId,
            isActive: true,
            deletedAt: null,
            completedAt: null,
            enrolledAt: existing.enrolledAt ?? now,
          },
          include: enrollmentInclude,
        });
      });

      return this.toEnrollmentModel(enrollment);
    } catch (error) {
      if (this.isUniqueEnrollmentConflict(error)) {
        const enrollment = await this.findByUserAndCourse(
          input.userId,
          input.courseId,
        );

        if (enrollment) {
          return enrollment;
        }
      }

      throw error;
    }
  }

  async findByUserAndCourse(
    userId: string,
    courseId: string,
  ): Promise<EnrollmentModel | null> {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
      include: enrollmentInclude,
    });

    return enrollment ? this.toEnrollmentModel(enrollment) : null;
  }

  async findManyByUser(
    params: FindMyEnrollmentsParams,
  ): Promise<EnrollmentModel[]> {
    const enrollments = await this.prisma.enrollment.findMany({
      where: this.buildVisibleEnrollmentWhere(params.userId),
      orderBy: {
        enrolledAt: 'desc',
      },
      take: params.limit,
      skip: params.offset,
      include: enrollmentInclude,
    });

    return enrollments.map((enrollment) => this.toEnrollmentModel(enrollment));
  }

  async countByUser(userId: string): Promise<number> {
    return this.prisma.enrollment.count({
      where: this.buildVisibleEnrollmentWhere(userId),
    });
  }

  private async createEnrollment(
    tx: Prisma.TransactionClient,
    input: EnrollLearnerInput,
  ): Promise<PrismaEnrollmentWithDetails> {
    const now = new Date();
    const enrollment = await tx.enrollment.create({
      data: {
        userId: input.userId,
        courseId: input.courseId,
        status: EnrollmentStatus.ACTIVE,
        enrolledAt: now,
        isActive: true,
      },
      include: enrollmentInclude,
    });

    if (!input.payment) {
      return enrollment;
    }

    const payment = await tx.payment.create({
      data: {
        userId: input.userId,
        courseId: input.courseId,
        amount: input.payment.amount,
        currency: input.payment.currency,
        paymentMethod: input.payment.paymentMethod,
        status: PaymentStatus.PAID,
        provider: input.payment.provider,
      },
    });

    return tx.enrollment.update({
      where: {
        id: enrollment.id,
      },
      data: {
        paymentId: payment.id,
      },
      include: enrollmentInclude,
    });
  }

  private async reactivateEnrollment(
    tx: Prisma.TransactionClient,
    existing: Enrollment,
    input: EnrollLearnerInput,
  ): Promise<PrismaEnrollmentWithDetails> {
    const now = new Date();
    const claim = await tx.enrollment.updateMany({
      where: {
        id: existing.id,
        OR: [
          {
            status: {
              in: [EnrollmentStatus.CANCELLED, EnrollmentStatus.EXPIRED],
            },
          },
          {
            isActive: false,
          },
          {
            deletedAt: {
              not: null,
            },
          },
        ],
      },
      data: {
        status: EnrollmentStatus.ACTIVE,
        isActive: true,
        deletedAt: null,
        completedAt: null,
        enrolledAt: existing.enrolledAt ?? now,
        paymentId: null,
      },
    });

    if (claim.count === 0) {
      return tx.enrollment.findUniqueOrThrow({
        where: {
          id: existing.id,
        },
        include: enrollmentInclude,
      });
    }

    if (!input.payment) {
      return tx.enrollment.findUniqueOrThrow({
        where: {
          id: existing.id,
        },
        include: enrollmentInclude,
      });
    }

    const payment = await tx.payment.create({
      data: {
        userId: input.userId,
        courseId: input.courseId,
        amount: input.payment.amount,
        currency: input.payment.currency,
        paymentMethod: input.payment.paymentMethod,
        status: PaymentStatus.PAID,
        provider: input.payment.provider,
      },
    });

    return tx.enrollment.update({
      where: {
        id: existing.id,
      },
      data: {
        paymentId: payment.id,
      },
      include: enrollmentInclude,
    });
  }

  private buildVisibleEnrollmentWhere(
    userId: string,
  ): Prisma.EnrollmentWhereInput {
    return {
      userId,
      isActive: true,
      deletedAt: null,
    };
  }

  private isCurrentEnrollment(enrollment: Enrollment): boolean {
    return (
      enrollment.isActive &&
      enrollment.deletedAt === null &&
      (enrollment.status === EnrollmentStatus.ACTIVE ||
        enrollment.status === EnrollmentStatus.COMPLETED)
    );
  }

  private isUniqueEnrollmentConflict(error: unknown): boolean {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
      return false;
    }

    const target = error.meta?.target;

    return (
      error.code === 'P2002' &&
      Array.isArray(target) &&
      target.includes('userId') &&
      target.includes('courseId')
    );
  }

  private toEnrollmentModel(
    enrollment: PrismaEnrollmentWithDetails,
  ): EnrollmentModel {
    return {
      id: enrollment.id,
      userId: enrollment.userId,
      courseId: enrollment.courseId,
      paymentId: enrollment.paymentId,
      status: enrollment.status,
      progressPercentage: enrollment.progressPercentage,
      enrolledAt: enrollment.enrolledAt,
      completedAt: enrollment.completedAt,
      isActive: enrollment.isActive,
      createdAt: enrollment.createdAt,
      updatedAt: enrollment.updatedAt,
      deletedAt: enrollment.deletedAt,
      course: {
        id: enrollment.course.id,
        title: enrollment.course.title,
        slug: enrollment.course.slug,
        shortDescription: enrollment.course.shortDescription,
        thumbnailUrl: enrollment.course.thumbnailUrl,
        level: enrollment.course.level,
        price: enrollment.course.price?.toNumber() ?? null,
      },
      payment: enrollment.payment
        ? this.toPaymentModel(enrollment.payment)
        : null,
    };
  }

  private toPaymentModel(payment: PaymentModel): PaymentModel {
    return {
      id: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      paymentMethod: payment.paymentMethod,
      status: payment.status,
      createdAt: payment.createdAt,
    };
  }
}
