import { CourseInstructor } from './../../../../generated/prisma/browser';
// ======================== Course ====================
export const CourseStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
  IN_REVIEW: 'IN_REVIEW',
  CHANGES_REQUESTED: 'CHANGES_REQUESTED',
} as const;

export type CourseModel = {
  id: string;
  price: number;
};

// ======================== Payment ====================

export type CreatePaymentInput = {
  userId: string;
  courseId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  provider: string | 'VNPAY';
  txnRef: string;
};

export interface UpdatePaymentInput {
  status?: PaymentStatus;

  providerPaymentId?: string | null;
  providerMetadata?: JsonValue | null;

  paidAt?: Date | null;

  isActive?: boolean;
  deletedAt?: Date | null;
}

export interface SettlePaidPaymentAndActivateEnrollmentInput {
  paymentId: string;
  providerPaymentId?: string | null;
  providerMetadata?: JsonValue | null;
  paidAt: Date;
}

export interface MarkPendingPaymentFailedInput {
  providerPaymentId?: string | null;
  providerMetadata?: JsonValue | null;
}

export type PaidPaymentSettlementStatus =
  | 'paid'
  | 'already_paid'
  | 'already_settled';

export interface PaidPaymentSettlementResult {
  status: PaidPaymentSettlementStatus;
  payment: PaymentModel;
}

export const PaymentMethod = {
  VNPAY: 'VNPAY',
  SIMULATION: 'SIMULATION',
} as const;

export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const PaymentStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
} as const;

export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | JsonObject | JsonArray;

export interface JsonObject {
  [key: string]: JsonValue;
}

export type JsonArray = JsonValue[];

export interface PaymentModel {
  id: string;

  userId: string;
  courseId: string;

  amount: number;
  currency: string;

  paymentMethod: PaymentMethod;
  status: PaymentStatus;

  provider: string;
  txnRef: string | null;

  providerPaymentId: string | null;
  providerMetadata: JsonValue | null;

  paidAt: Date | null;

  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export type FindUniquePaymentInput =
  | {
      id: string;
      txnRef?: never;
      userId?: never;
      courseId?: never;
    }
  | {
      txnRef: string;
      id?: never;
      userId?: never;
      courseId?: never;
    }
  | {
      userId: string;
      courseId: string;
      id?: never;
      txnRef?: never;
    };

// Payment history
export interface FindLearnerPaymentHistoryInput {
  learnerId: string;
  limit: number;
  offset: number;
}

export interface LearnerPaymentHistoryCourse {
  id: string;
  title: string;
  slug: string;
}

export interface LearnerPaymentHistoryItem {
  id: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  paidAt: Date | null;
  createdAt: Date;
  course: LearnerPaymentHistoryCourse;
}

export interface IPaymentRepository {
  findCourseById(courseId: string): Promise<CourseModel | null>;
  create(input: CreatePaymentInput): Promise<PaymentModel>;

  findUniquePayment(
    input: FindUniquePaymentInput,
  ): Promise<PaymentModel | null>;

  update(
    paymentId: string,
    input: UpdatePaymentInput,
  ): Promise<PaymentModel | null>;

  settlePaidPaymentAndActivateEnrollment(
    input: SettlePaidPaymentAndActivateEnrollmentInput,
  ): Promise<PaidPaymentSettlementResult | null>;

  markPendingPaymentFailed(
    paymentId: string,
    input: MarkPendingPaymentFailedInput,
  ): Promise<PaymentModel | null>;

  findLearnerPaymentHistory(
    input: FindLearnerPaymentHistoryInput,
  ): Promise<LearnerPaymentHistoryItem[]>;

  countLearnerPayments(learnerId: string): Promise<number>;
}
