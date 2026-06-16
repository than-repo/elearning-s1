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
type VnpayServiceMock = jest.Mocked<Pick<VnpayService, 'verifyReturnUrl'>>;

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
    jest.clearAllMocks();
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
