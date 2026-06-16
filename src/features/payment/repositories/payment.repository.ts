import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/core/database/prisma.service';
import {
  CourseModel,
  CreatePaymentInput,
  IPaymentRepository,
  JsonValue,
  MarkPendingPaymentFailedInput,
  PaidPaymentSettlementResult,
  PaymentModel,
  PaymentMethod as DomainPaymentMethod,
  PaymentStatus as DomainPaymentStatus,
  FindUniquePaymentInput,
  SettlePaidPaymentAndActivateEnrollmentInput,
  UpdatePaymentInput,
} from '../interfaces/payment.repository.interface';

import {
  Prisma,
  Course as PrismaCourse,
  Enrollment as PrismaEnrollment,
  EnrollmentStatus as PrismaEnrollmentStatus,
  Payment as PrismaPayment,
  PaymentMethod as PrismaPaymentMethod,
  PaymentStatus as PrismaPaymentStatus,
} from 'generated/prisma/client';
@Injectable()
export class PaymentRepository implements IPaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toCourse(course: PrismaCourse): CourseModel {
    return {
      id: course.id,
      price: course.price ? course.price.toNumber() : 0,
    };
  }
  private toPaymentMethod(method: PrismaPaymentMethod): DomainPaymentMethod {
    switch (method) {
      case PrismaPaymentMethod.VNPAY:
        return DomainPaymentMethod.VNPAY;

      default:
        throw new Error(`Unsupported payment method: ${method}`);
    }
  }
  private toPaymentStatus(status: PrismaPaymentStatus): DomainPaymentStatus {
    switch (status) {
      case PrismaPaymentStatus.PENDING:
        return DomainPaymentStatus.PENDING;

      case PrismaPaymentStatus.PAID:
        return DomainPaymentStatus.PAID;

      case PrismaPaymentStatus.FAILED:
        return DomainPaymentStatus.FAILED;

      case PrismaPaymentStatus.CANCELLED:
        return DomainPaymentStatus.CANCELLED;

      case PrismaPaymentStatus.EXPIRED:
        return DomainPaymentStatus.EXPIRED;

      default:
        throw new Error(`Unsupported payment status: ${status}`);
    }
  }
  private toPayment(payment: PrismaPayment): PaymentModel {
    return {
      id: payment.id,

      userId: payment.userId,
      courseId: payment.courseId,

      amount: payment.amount,
      currency: payment.currency,

      paymentMethod: this.toPaymentMethod(payment.paymentMethod),
      status: this.toPaymentStatus(payment.status),

      provider: payment.provider,
      txnRef: payment.txnRef,

      providerPaymentId: payment.providerPaymentId,
      providerMetadata: payment.providerMetadata as JsonValue | null,

      paidAt: payment.paidAt,

      isActive: payment.isActive,

      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      deletedAt: payment.deletedAt,
    };
  }

  private toPrismaJson(
    value: JsonValue | null | undefined,
  ): Prisma.InputJsonValue | typeof Prisma.DbNull | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return Prisma.DbNull;
    }

    return value as Prisma.InputJsonValue;
  }

  private isCurrentEnrollment(enrollment: PrismaEnrollment): boolean {
    return (
      enrollment.isActive &&
      !enrollment.deletedAt &&
      (enrollment.status === PrismaEnrollmentStatus.ACTIVE ||
        enrollment.status === PrismaEnrollmentStatus.COMPLETED)
    );
  }

  private async activateEnrollmentForPayment(
    tx: Prisma.TransactionClient,
    payment: PrismaPayment,
    enrolledAt: Date,
  ): Promise<void> {
    await tx.enrollment.createMany({
      data: [
        {
          userId: payment.userId,
          courseId: payment.courseId,
          paymentId: payment.id,
          status: PrismaEnrollmentStatus.ACTIVE,
          enrolledAt,
          isActive: true,
        },
      ],
      skipDuplicates: true,
    });

    const existing = await tx.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: payment.userId,
          courseId: payment.courseId,
        },
      },
    });

    if (!existing) {
      throw new Error('Enrollment could not be activated for paid payment');
    }

    if (this.isCurrentEnrollment(existing)) {
      await tx.enrollment.update({
        where: { id: existing.id },
        data: {
          paymentId: payment.id,
        },
      });

      return;
    }

    await tx.enrollment.update({
      where: { id: existing.id },
      data: {
        status: PrismaEnrollmentStatus.ACTIVE,
        paymentId: payment.id,
        isActive: true,
        deletedAt: null,
        completedAt: null,
        enrolledAt: existing.enrolledAt ?? enrolledAt,
      },
    });
  }

  async findCourseById(courseId: string): Promise<CourseModel | null> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId, deletedAt: null, status: 'PUBLISHED' },
    });

    if (!course) {
      return null;
    }
    return this.toCourse(course);
  }
  async create(input: CreatePaymentInput): Promise<PaymentModel> {
    return this.toPayment(
      await this.prisma.payment.create({
        data: { ...input },
      }),
    );
  }
  async findUniquePayment(
    input: FindUniquePaymentInput,
  ): Promise<PaymentModel | null> {
    let payment: PrismaPayment | null = null;

    if ('id' in input) {
      payment = await this.prisma.payment.findUnique({
        where: {
          id: input.id,
        },
      });
    } else if ('txnRef' in input) {
      payment = await this.prisma.payment.findUnique({
        where: {
          txnRef: input.txnRef,
        },
      });
    } else {
      payment = await this.prisma.payment.findFirst({
        where: {
          userId: input.userId,
          courseId: input.courseId,
          isActive: true,
          deletedAt: null,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    }

    if (!payment) {
      return null;
    }

    return this.toPayment(payment);
  }
  async update(
    paymentId: string,
    input: UpdatePaymentInput,
  ): Promise<PaymentModel | null> {
    const data: Prisma.PaymentUpdateInput = {
      status: input.status,

      providerPaymentId: input.providerPaymentId,
      paidAt: input.paidAt,

      isActive: input.isActive,
      deletedAt: input.deletedAt,

      providerMetadata: this.toPrismaJson(input.providerMetadata),
    };

    const updatedPayment = await this.prisma.payment.update({
      where: { id: paymentId },
      data,
    });

    return this.toPayment(updatedPayment);
  }

  async settlePaidPaymentAndActivateEnrollment(
    input: SettlePaidPaymentAndActivateEnrollmentInput,
  ): Promise<PaidPaymentSettlementResult | null> {
    return this.prisma.$transaction(async (tx) => {
      const existingPayment = await tx.payment.findUnique({
        where: {
          id: input.paymentId,
        },
      });

      if (!existingPayment) {
        return null;
      }

      if (
        existingPayment.status !== PrismaPaymentStatus.PENDING &&
        existingPayment.status !== PrismaPaymentStatus.PAID
      ) {
        return {
          status: 'already_settled',
          payment: this.toPayment(existingPayment),
        };
      }

      const isAlreadyPaid = existingPayment.status === PrismaPaymentStatus.PAID;

      const payment = isAlreadyPaid
        ? existingPayment
        : await tx.payment.update({
            where: {
              id: existingPayment.id,
            },
            data: {
              status: PrismaPaymentStatus.PAID,
              providerPaymentId: input.providerPaymentId,
              providerMetadata: this.toPrismaJson(input.providerMetadata),
              paidAt: input.paidAt,
            },
          });

      await this.activateEnrollmentForPayment(tx, payment, input.paidAt);

      return {
        status: isAlreadyPaid ? 'already_paid' : 'paid',
        payment: this.toPayment(payment),
      };
    });
  }

  async markPendingPaymentFailed(
    paymentId: string,
    input: MarkPendingPaymentFailedInput,
  ): Promise<PaymentModel | null> {
    await this.prisma.payment.updateMany({
      where: {
        id: paymentId,
        status: PrismaPaymentStatus.PENDING,
      },
      data: {
        status: PrismaPaymentStatus.FAILED,
        providerPaymentId: input.providerPaymentId,
        providerMetadata: this.toPrismaJson(input.providerMetadata),
        paidAt: null,
      },
    });

    return this.findUniquePayment({ id: paymentId });
  }
}
