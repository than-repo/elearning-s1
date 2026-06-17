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

export enum PaymentMethod {
  VNPAY = 'VNPAY',
  SIMULATION = 'SIMULATION',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

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
}
