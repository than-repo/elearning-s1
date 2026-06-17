import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

jest.mock('./vnpay.service', () => ({
  VnpayService: class VnpayService {},
}));

import type {
  IPaymentRepository,
  PaymentModel,
} from '../interfaces/payment.repository.interface';
import {
  PaymentMethod,
  PaymentStatus,
} from '../interfaces/payment.repository.interface';
import { PAYMENT_REPOSITORY } from '../repositories/payment.repository.token';
import { VnpayService } from './vnpay.service';
import { PaymentsService } from './payments.service';

type PaymentRepositoryMock = jest.Mocked<IPaymentRepository>;
type VnpayServiceMock = jest.Mocked<
  Pick<VnpayService, 'createPaymentUrl' | 'verifyReturnUrl'>
>;

const userId = '11111111-1111-4111-8111-111111111111';
const courseId = '22222222-2222-4222-8222-222222222222';
const paymentId = '33333333-3333-4333-8333-333333333333';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let paymentRepository: PaymentRepositoryMock;
  let vnpayService: VnpayServiceMock;

  beforeEach(async () => {
    paymentRepository = createPaymentRepositoryMock();
    vnpayService = {
      createPaymentUrl: jest.fn().mockReturnValue('https://vnpay.test/pay'),
      verifyReturnUrl: jest.fn().mockReturnValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: PAYMENT_REPOSITORY,
          useValue: paymentRepository,
        },
        {
          provide: VnpayService,
          useValue: vnpayService,
        },
      ],
    }).compile();

    service = module.get(PaymentsService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('createVnpayPaymentUrl', () => {
    it('creates a pending VNPAY payment with sandbox-safe request params', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-06-16T01:30:45.000Z'));
      paymentRepository.findCourseById.mockResolvedValue({
        id: courseId,
        price: 1000,
      });
      paymentRepository.create.mockImplementation(async (input) =>
        createPayment({
          amount: input.amount,
          courseId: input.courseId,
          paymentMethod: input.paymentMethod,
          provider: input.provider,
          status: input.status,
          txnRef: input.txnRef,
          userId: input.userId,
        }),
      );

      const result = await service.createVnpayPaymentUrl(
        userId,
        {
          courseId,
          bankCode: 'NCB',
          locale: 'vn',
        },
        '127.0.0.1',
      );

      const createdTxnRef = paymentRepository.create.mock.calls[0][0].txnRef;

      expect(createdTxnRef).toEqual(expect.stringMatching(/^PAY[0-9A-F]+$/));
      expect(paymentRepository.create).toHaveBeenCalledWith({
        userId,
        courseId,
        amount: 1000,
        paymentMethod: PaymentMethod.VNPAY,
        status: PaymentStatus.PENDING,
        provider: 'VNPAY',
        txnRef: createdTxnRef,
      });
      expect(vnpayService.createPaymentUrl).toHaveBeenCalledWith({
        txnRef: createdTxnRef,
        amount: 1000,
        orderInfo: 'Thanh toan khoa hoc',
        ipAddr: '127.0.0.1',
        bankCode: 'NCB',
        locale: 'vn',
      });
      expect(result).toEqual({
        paymentId,
        txnRef: createdTxnRef,
        amount: 1000,
        paymentUrl: 'https://vnpay.test/pay',
      });
    });
  });

  describe('handleVnpayIpn', () => {
    it('settles a successful pending payment atomically', async () => {
      const payment = createPayment({ status: PaymentStatus.PENDING });
      const query = createVnpayQuery();

      paymentRepository.findUniquePayment.mockResolvedValue(payment);
      paymentRepository.settlePaidPaymentAndActivateEnrollment.mockResolvedValue(
        {
          status: 'paid',
          payment: createPayment({
            status: PaymentStatus.PAID,
            paidAt: new Date('2026-06-16T01:00:00.000Z'),
          }),
        },
      );

      const result = await service.handleVnpayIpn(query);

      expect(result).toEqual({ RspCode: '00', Message: 'Success' });
      expect(
        paymentRepository.settlePaidPaymentAndActivateEnrollment,
      ).toHaveBeenCalledWith({
        paymentId: payment.id,
        providerPaymentId: 'vnp-transaction-1',
        providerMetadata: query,
        paidAt: expect.any(Date),
      });
      expect(paymentRepository.markPendingPaymentFailed).not.toHaveBeenCalled();
    });

    it('returns success for an idempotent already-paid settlement', async () => {
      const payment = createPayment({ status: PaymentStatus.PAID });

      paymentRepository.findUniquePayment.mockResolvedValue(payment);
      paymentRepository.settlePaidPaymentAndActivateEnrollment.mockResolvedValue(
        {
          status: 'already_paid',
          payment,
        },
      );

      const result = await service.handleVnpayIpn(createVnpayQuery());

      expect(result).toEqual({ RspCode: '00', Message: 'Success' });
      expect(
        paymentRepository.settlePaidPaymentAndActivateEnrollment,
      ).toHaveBeenCalledTimes(1);
      expect(paymentRepository.markPendingPaymentFailed).not.toHaveBeenCalled();
    });

    it('updates a failed VNPay result only when the payment is pending', async () => {
      const payment = createPayment({ status: PaymentStatus.PENDING });
      const query = createVnpayQuery({
        vnp_ResponseCode: '24',
        vnp_TransactionStatus: '02',
      });

      paymentRepository.findUniquePayment.mockResolvedValue(payment);
      paymentRepository.markPendingPaymentFailed.mockResolvedValue(
        createPayment({ status: PaymentStatus.FAILED }),
      );

      const result = await service.handleVnpayIpn(query);

      expect(result).toEqual({ RspCode: '00', Message: 'Success' });
      expect(paymentRepository.markPendingPaymentFailed).toHaveBeenCalledWith(
        payment.id,
        {
          providerPaymentId: 'vnp-transaction-1',
          providerMetadata: query,
        },
      );
      expect(
        paymentRepository.settlePaidPaymentAndActivateEnrollment,
      ).not.toHaveBeenCalled();
    });

    it('returns order-already-updated for failed VNPay result on non-pending payment', async () => {
      paymentRepository.findUniquePayment.mockResolvedValue(
        createPayment({ status: PaymentStatus.CANCELLED }),
      );

      const result = await service.handleVnpayIpn(
        createVnpayQuery({
          vnp_ResponseCode: '24',
          vnp_TransactionStatus: '02',
        }),
      );

      expect(result).toEqual({
        RspCode: '02',
        Message: 'This order has been updated to the payment status',
      });
      expect(paymentRepository.markPendingPaymentFailed).not.toHaveBeenCalled();
    });

    it('returns checksum failed for a bad signature', async () => {
      vnpayService.verifyReturnUrl.mockReturnValue(false);

      const result = await service.handleVnpayIpn(createVnpayQuery());

      expect(result).toEqual({ RspCode: '97', Message: 'Checksum failed' });
      expect(paymentRepository.findUniquePayment).not.toHaveBeenCalled();
    });

    it('returns order not found when txn ref is missing', async () => {
      const query = createVnpayQuery({ vnp_TxnRef: undefined });

      const result = await service.handleVnpayIpn(query);

      expect(result).toEqual({ RspCode: '01', Message: 'Order not found' });
      expect(paymentRepository.findUniquePayment).not.toHaveBeenCalled();
    });

    it('returns order not found when payment cannot be found', async () => {
      paymentRepository.findUniquePayment.mockResolvedValue(null);

      const result = await service.handleVnpayIpn(createVnpayQuery());

      expect(result).toEqual({ RspCode: '01', Message: 'Order not found' });
    });

    it('returns amount invalid when VNPay amount does not match payment amount', async () => {
      paymentRepository.findUniquePayment.mockResolvedValue(
        createPayment({ amount: 2000 }),
      );

      const result = await service.handleVnpayIpn(createVnpayQuery());

      expect(result).toEqual({ RspCode: '04', Message: 'Amount invalid' });
      expect(
        paymentRepository.settlePaidPaymentAndActivateEnrollment,
      ).not.toHaveBeenCalled();
      expect(paymentRepository.markPendingPaymentFailed).not.toHaveBeenCalled();
    });
  });

  describe('createSimulationPayment', () => {
    it('creates a pending simulation payment for a paid course', async () => {
      paymentRepository.findCourseById.mockResolvedValue({
        id: courseId,
        price: 1000,
      });
      paymentRepository.create.mockResolvedValue(
        createPayment({
          paymentMethod: PaymentMethod.SIMULATION,
          provider: 'SIMULATION',
          txnRef: 'SIM_1',
        }),
      );

      const result = await service.createSimulationPayment(userId, {
        courseId,
      });

      expect(paymentRepository.create).toHaveBeenCalledWith({
        userId,
        courseId,
        amount: 1000,
        paymentMethod: PaymentMethod.SIMULATION,
        status: PaymentStatus.PENDING,
        provider: 'SIMULATION',
        txnRef: expect.stringMatching(/^SIM_/),
      });
      expect(result.status).toBe('pending');
      expect(result.payment.paymentMethod).toBe(PaymentMethod.SIMULATION);
    });

    it('rejects missing courses', async () => {
      paymentRepository.findCourseById.mockResolvedValue(null);

      await expect(
        service.createSimulationPayment(userId, { courseId }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(paymentRepository.create).not.toHaveBeenCalled();
    });

    it('rejects courses without a positive integer price', async () => {
      paymentRepository.findCourseById.mockResolvedValue({
        id: courseId,
        price: 0,
      });

      await expect(
        service.createSimulationPayment(userId, { courseId }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(paymentRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('confirmSimulationPayment', () => {
    it('settles a learner-owned pending simulation payment', async () => {
      const payment = createSimulationPayment();

      paymentRepository.findUniquePayment.mockResolvedValue(payment);
      paymentRepository.settlePaidPaymentAndActivateEnrollment.mockResolvedValue(
        {
          status: 'paid',
          payment: createSimulationPayment({
            status: PaymentStatus.PAID,
            paidAt: new Date('2026-06-16T01:00:00.000Z'),
          }),
        },
      );

      const result = await service.confirmSimulationPayment(userId, payment.id);

      expect(
        paymentRepository.settlePaidPaymentAndActivateEnrollment,
      ).toHaveBeenCalledWith({
        paymentId: payment.id,
        providerPaymentId: `SIM-${payment.txnRef}`,
        providerMetadata: {
          provider: 'SIMULATION',
          action: 'confirm',
          confirmedAt: expect.any(String),
        },
        paidAt: expect.any(Date),
      });
      expect(result.status).toBe('success');
      expect(result.payment.status).toBe(PaymentStatus.PAID);
    });

    it('rejects another learner payment', async () => {
      paymentRepository.findUniquePayment.mockResolvedValue(
        createSimulationPayment({ userId: 'other-user-id' }),
      );

      await expect(
        service.confirmSimulationPayment(userId, paymentId),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(
        paymentRepository.settlePaidPaymentAndActivateEnrollment,
      ).not.toHaveBeenCalled();
    });

    it('returns already paid for duplicate confirmation', async () => {
      paymentRepository.findUniquePayment.mockResolvedValue(
        createSimulationPayment({ status: PaymentStatus.PAID }),
      );

      const result = await service.confirmSimulationPayment(userId, paymentId);

      expect(result.status).toBe('already_paid');
      expect(
        paymentRepository.settlePaidPaymentAndActivateEnrollment,
      ).not.toHaveBeenCalled();
    });

    it('rejects failed simulation payments', async () => {
      paymentRepository.findUniquePayment.mockResolvedValue(
        createSimulationPayment({ status: PaymentStatus.FAILED }),
      );

      await expect(
        service.confirmSimulationPayment(userId, paymentId),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('failSimulationPayment', () => {
    it('marks a learner-owned pending simulation payment failed', async () => {
      const payment = createSimulationPayment();

      paymentRepository.findUniquePayment.mockResolvedValue(payment);
      paymentRepository.markPendingPaymentFailed.mockResolvedValue(
        createSimulationPayment({ status: PaymentStatus.FAILED }),
      );

      const result = await service.failSimulationPayment(userId, payment.id);

      expect(paymentRepository.markPendingPaymentFailed).toHaveBeenCalledWith(
        payment.id,
        {
          providerPaymentId: `SIM-${payment.txnRef}`,
          providerMetadata: {
            provider: 'SIMULATION',
            action: 'fail',
            failedAt: expect.any(String),
          },
        },
      );
      expect(result.status).toBe('failed');
      expect(result.payment.status).toBe(PaymentStatus.FAILED);
    });

    it('returns failed for duplicate failure requests', async () => {
      paymentRepository.findUniquePayment.mockResolvedValue(
        createSimulationPayment({ status: PaymentStatus.FAILED }),
      );

      const result = await service.failSimulationPayment(userId, paymentId);

      expect(result.status).toBe('failed');
      expect(paymentRepository.markPendingPaymentFailed).not.toHaveBeenCalled();
    });

    it('rejects already-paid simulation payments', async () => {
      paymentRepository.findUniquePayment.mockResolvedValue(
        createSimulationPayment({ status: PaymentStatus.PAID }),
      );

      await expect(
        service.failSimulationPayment(userId, paymentId),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});

function createPaymentRepositoryMock(): PaymentRepositoryMock {
  return {
    findCourseById: jest.fn(),
    create: jest.fn(),
    findUniquePayment: jest.fn(),
    update: jest.fn(),
    settlePaidPaymentAndActivateEnrollment: jest.fn(),
    markPendingPaymentFailed: jest.fn(),
  };
}

function createPayment(overrides: Partial<PaymentModel> = {}): PaymentModel {
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

function createSimulationPayment(
  overrides: Partial<PaymentModel> = {},
): PaymentModel {
  return createPayment({
    paymentMethod: PaymentMethod.SIMULATION,
    provider: 'SIMULATION',
    txnRef: 'SIM_1',
    ...overrides,
  });
}

function createVnpayQuery(
  overrides: Record<string, string | undefined> = {},
): Record<string, string | undefined> {
  return {
    vnp_TxnRef: 'txn-1',
    vnp_ResponseCode: '00',
    vnp_TransactionStatus: '00',
    vnp_Amount: '100000',
    vnp_TransactionNo: 'vnp-transaction-1',
    ...overrides,
  };
}
