jest.mock(
  'generated/prisma/client',
  () => ({
    Prisma: {
      DbNull: 'DbNull',
    },
    EnrollmentStatus: {
      ACTIVE: 'ACTIVE',
      COMPLETED: 'COMPLETED',
      CANCELLED: 'CANCELLED',
      EXPIRED: 'EXPIRED',
    },
    PaymentMethod: {
      VNPAY: 'VNPAY',
    },
    PaymentStatus: {
      PENDING: 'PENDING',
      PAID: 'PAID',
      FAILED: 'FAILED',
      CANCELLED: 'CANCELLED',
      EXPIRED: 'EXPIRED',
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

import {
  EnrollmentStatus,
  PaymentMethod,
  PaymentStatus,
} from 'generated/prisma/client';

import { PaymentRepository } from './payment.repository';

type PaymentDelegateMock = {
  create: jest.Mock;
  findFirst: jest.Mock;
  findUnique: jest.Mock;
  update: jest.Mock;
  updateMany: jest.Mock;
};

type EnrollmentDelegateMock = {
  createMany: jest.Mock;
  findUnique: jest.Mock;
  update: jest.Mock;
};

type TransactionClientMock = {
  payment: Pick<PaymentDelegateMock, 'findUnique' | 'update'>;
  enrollment: EnrollmentDelegateMock;
};

type PrismaServiceMock = {
  course: {
    findUnique: jest.Mock;
  };
  payment: PaymentDelegateMock;
  enrollment: EnrollmentDelegateMock;
  $transaction: jest.Mock;
};

const userId = '11111111-1111-4111-8111-111111111111';
const courseId = '22222222-2222-4222-8222-222222222222';
const paymentId = '33333333-3333-4333-8333-333333333333';
const enrollmentId = '44444444-4444-4444-8444-444444444444';
const paidAt = new Date('2026-06-16T01:00:00.000Z');

describe('PaymentRepository', () => {
  let repository: PaymentRepository;
  let prisma: PrismaServiceMock;
  let tx: TransactionClientMock;

  beforeEach(() => {
    tx = {
      payment: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      enrollment: {
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    prisma = {
      course: {
        findUnique: jest.fn(),
      },
      payment: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      enrollment: {
        createMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(
        (callback: (client: TransactionClientMock) => unknown) => callback(tx),
      ),
    };

    repository = new PaymentRepository(
      prisma as unknown as ConstructorParameters<typeof PaymentRepository>[0],
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('settles a pending payment and activates enrollment in one transaction', async () => {
    tx.payment.findUnique.mockResolvedValue(
      makePrismaPayment({ status: PaymentStatus.PENDING }),
    );
    tx.payment.update.mockResolvedValue(
      makePrismaPayment({
        status: PaymentStatus.PAID,
        providerPaymentId: 'vnp-transaction-1',
        paidAt,
      }),
    );
    tx.enrollment.findUnique.mockResolvedValue(
      makePrismaEnrollment({ paymentId }),
    );

    const result = await repository.settlePaidPaymentAndActivateEnrollment({
      paymentId,
      providerPaymentId: 'vnp-transaction-1',
      providerMetadata: { vnp_TxnRef: 'txn-1' },
      paidAt,
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.payment.update).toHaveBeenCalledWith({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.PAID,
        providerPaymentId: 'vnp-transaction-1',
        providerMetadata: { vnp_TxnRef: 'txn-1' },
        paidAt,
      },
    });
    expect(tx.enrollment.createMany).toHaveBeenCalledWith({
      data: [
        {
          userId,
          courseId,
          paymentId,
          status: EnrollmentStatus.ACTIVE,
          enrolledAt: paidAt,
          isActive: true,
        },
      ],
      skipDuplicates: true,
    });
    expect(result?.status).toBe('paid');
    expect(result?.payment.status).toBe(PaymentStatus.PAID);
  });

  it('keeps duplicate paid IPN idempotent and does not update payment again', async () => {
    tx.payment.findUnique.mockResolvedValue(
      makePrismaPayment({ status: PaymentStatus.PAID, paidAt }),
    );
    tx.enrollment.findUnique.mockResolvedValue(
      makePrismaEnrollment({ paymentId }),
    );

    const result = await repository.settlePaidPaymentAndActivateEnrollment({
      paymentId,
      providerPaymentId: 'vnp-transaction-1',
      providerMetadata: { vnp_TxnRef: 'txn-1' },
      paidAt,
    });

    expect(tx.payment.update).not.toHaveBeenCalled();
    expect(tx.enrollment.createMany).toHaveBeenCalledTimes(1);
    expect(tx.enrollment.update).toHaveBeenCalledWith({
      where: { id: enrollmentId },
      data: {
        paymentId,
      },
    });
    expect(result?.status).toBe('already_paid');
  });

  it('does not overwrite already-settled non-paid payments', async () => {
    tx.payment.findUnique.mockResolvedValue(
      makePrismaPayment({ status: PaymentStatus.FAILED }),
    );

    const result = await repository.settlePaidPaymentAndActivateEnrollment({
      paymentId,
      providerPaymentId: 'vnp-transaction-1',
      providerMetadata: { vnp_TxnRef: 'txn-1' },
      paidAt,
    });

    expect(tx.payment.update).not.toHaveBeenCalled();
    expect(tx.enrollment.createMany).not.toHaveBeenCalled();
    expect(tx.enrollment.update).not.toHaveBeenCalled();
    expect(result?.status).toBe('already_settled');
  });

  it('reactivates an inactive enrollment and links it to the paid payment', async () => {
    const oldEnrolledAt = new Date('2026-05-01T00:00:00.000Z');

    tx.payment.findUnique.mockResolvedValue(
      makePrismaPayment({ status: PaymentStatus.PENDING }),
    );
    tx.payment.update.mockResolvedValue(
      makePrismaPayment({ status: PaymentStatus.PAID, paidAt }),
    );
    tx.enrollment.findUnique.mockResolvedValue(
      makePrismaEnrollment({
        paymentId: null,
        status: EnrollmentStatus.CANCELLED,
        isActive: false,
        enrolledAt: oldEnrolledAt,
        deletedAt: new Date('2026-05-10T00:00:00.000Z'),
      }),
    );

    await repository.settlePaidPaymentAndActivateEnrollment({
      paymentId,
      providerPaymentId: 'vnp-transaction-1',
      providerMetadata: { vnp_TxnRef: 'txn-1' },
      paidAt,
    });

    expect(tx.enrollment.update).toHaveBeenCalledWith({
      where: { id: enrollmentId },
      data: {
        status: EnrollmentStatus.ACTIVE,
        paymentId,
        isActive: true,
        deletedAt: null,
        completedAt: null,
        enrolledAt: oldEnrolledAt,
      },
    });
  });

  it('lets transaction failure roll back payment update when enrollment activation fails', async () => {
    const error = new Error('enrollment write failed');

    tx.payment.findUnique.mockResolvedValue(
      makePrismaPayment({ status: PaymentStatus.PENDING }),
    );
    tx.payment.update.mockResolvedValue(
      makePrismaPayment({ status: PaymentStatus.PAID, paidAt }),
    );
    tx.enrollment.createMany.mockRejectedValue(error);

    await expect(
      repository.settlePaidPaymentAndActivateEnrollment({
        paymentId,
        providerPaymentId: 'vnp-transaction-1',
        providerMetadata: { vnp_TxnRef: 'txn-1' },
        paidAt,
      }),
    ).rejects.toThrow(error);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});

function makePrismaPayment(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: paymentId,
    userId,
    courseId,
    amount: 1000,
    currency: 'VND',
    paymentMethod: PaymentMethod.VNPAY,
    status: PaymentStatus.PENDING,
    provider: 'VNPAY',
    txnRef: 'txn-1',
    providerPaymentId: null,
    providerMetadata: null,
    paidAt: null,
    isActive: true,
    createdAt: new Date('2026-06-16T00:00:00.000Z'),
    updatedAt: new Date('2026-06-16T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

function makePrismaEnrollment(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: enrollmentId,
    userId,
    courseId,
    paymentId,
    status: EnrollmentStatus.ACTIVE,
    progressPercentage: 0,
    enrolledAt: paidAt,
    completedAt: null,
    isActive: true,
    createdAt: new Date('2026-06-16T00:00:00.000Z'),
    updatedAt: new Date('2026-06-16T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}
