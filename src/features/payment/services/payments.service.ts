// src/payments/payments.service.ts

import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { VnpayService } from './vnpay.service';
import { CreateVnpayPaymentDto } from '../dtos/create-vnpay-payment.dto';
import { CreateSimulationPaymentDto } from '../dtos/create-simulation-payment.dto';

import type {
  CreatePaymentInput,
  IPaymentRepository,
  PaymentModel,
} from '../interfaces/payment.repository.interface';

import {
  PaymentMethod,
  PaymentStatus,
} from '../interfaces/payment.repository.interface';
import { VnpayReturnQuery } from '../interfaces/vnpayreturnquery.interface';
import {
  VnpayReturnResponseDto,
  VnpayReturnResponseStatus,
  PaymentResponseDto,
} from '../dtos/vnpay-return-response.dto';
import { plainToInstance } from 'class-transformer';
import {
  VnpayIpnResponseDto,
  VnpayIpnRspCode,
} from '../dtos/vnpay-inp-response.dto';
import {
  SimulationPaymentResponseDto,
  SimulationPaymentResponseStatus,
} from '../dtos/simulation-payment-response.dto';
import { randomUUID } from 'crypto';
import { PAYMENT_REPOSITORY } from '../repositories/payment.repository.token';
import {
  GetPaymentsQueryDto,
  GetPaymentsResponseDto,
  LearnerPaymentItemDto,
} from '../dtos/get-payments-response.dto';

const DEFAULT_PAYMENT_LIMIT = 10;
const MAX_PAYMENT_LIMIT = 50;

@Injectable()
export class PaymentsService {
  constructor(
    private readonly vnpayService: VnpayService,

    @Inject(PAYMENT_REPOSITORY)
    private readonly iPaymentRepository: IPaymentRepository,
  ) {}

  async createVnpayPaymentUrl(
    userId: string,
    dto: CreateVnpayPaymentDto,
    ipAddr: string,
  ) {
    const course = await this.iPaymentRepository.findCourseById(dto.courseId);

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const amount = Number(course.price);

    if (!Number.isInteger(amount) || amount <= 0) {
      throw new BadRequestException('Invalid course price');
    }

    const txnRef = this.generateTxnRef('PAY');

    const payment = await this.iPaymentRepository.create({
      userId,
      courseId: course.id,
      amount,
      paymentMethod: PaymentMethod.VNPAY,
      status: PaymentStatus.PENDING,
      provider: 'VNPAY',
      txnRef,
    } satisfies CreatePaymentInput);

    const paymentUrl = this.vnpayService.createPaymentUrl({
      txnRef,
      amount: payment.amount,
      orderInfo: 'Thanh toan khoa hoc',
      ipAddr,
      bankCode: dto.bankCode,
      locale: dto.locale ?? 'vn',
    });

    return {
      paymentId: payment.id,
      txnRef: payment.txnRef,
      amount: payment.amount,
      paymentUrl,
    };
  }

  private generateTxnRef(prefix: 'PAY' | 'SIM'): string {
    if (prefix === 'PAY') {
      return `${prefix}${Date.now()}${randomUUID()
        .replace(/-/g, '')
        .slice(0, 8)
        .toUpperCase()}`;
    }

    return `${prefix}_${Date.now()}_${randomUUID()}`;
  }

  async createSimulationPayment(
    userId: string,
    dto: CreateSimulationPaymentDto,
  ): Promise<SimulationPaymentResponseDto> {
    const course = await this.iPaymentRepository.findCourseById(dto.courseId);

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const amount = Number(course.price);

    if (!Number.isInteger(amount) || amount <= 0) {
      throw new BadRequestException('Invalid course price');
    }

    const payment = await this.iPaymentRepository.create({
      userId,
      courseId: course.id,
      amount,
      paymentMethod: PaymentMethod.SIMULATION,
      status: PaymentStatus.PENDING,
      provider: 'SIMULATION',
      txnRef: this.generateTxnRef('SIM'),
    } satisfies CreatePaymentInput);

    return this.toSimulationPaymentResponseDto('pending', payment);
  }

  async confirmSimulationPayment(
    userId: string,
    paymentId: string,
  ): Promise<SimulationPaymentResponseDto> {
    const payment = await this.findOwnedSimulationPayment(userId, paymentId);

    if (payment.status === PaymentStatus.PAID) {
      return this.toSimulationPaymentResponseDto('already_paid', payment);
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException('Payment cannot be confirmed');
    }

    const confirmedAt = new Date();
    const settlement =
      await this.iPaymentRepository.settlePaidPaymentAndActivateEnrollment({
        paymentId: payment.id,
        providerPaymentId: `SIM-${payment.txnRef ?? payment.id}`,
        providerMetadata: {
          provider: 'SIMULATION',
          action: 'confirm',
          confirmedAt: confirmedAt.toISOString(),
        },
        paidAt: confirmedAt,
      });

    if (!settlement) {
      throw new NotFoundException('Payment not found');
    }

    return this.toSimulationPaymentResponseDto(
      settlement.status === 'already_paid' ? 'already_paid' : 'success',
      settlement.payment,
    );
  }

  async failSimulationPayment(
    userId: string,
    paymentId: string,
  ): Promise<SimulationPaymentResponseDto> {
    const payment = await this.findOwnedSimulationPayment(userId, paymentId);

    if (payment.status === PaymentStatus.FAILED) {
      return this.toSimulationPaymentResponseDto('failed', payment);
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException('Payment cannot be failed');
    }

    const failedPayment =
      await this.iPaymentRepository.markPendingPaymentFailed(payment.id, {
        providerPaymentId: `SIM-${payment.txnRef ?? payment.id}`,
        providerMetadata: {
          provider: 'SIMULATION',
          action: 'fail',
          failedAt: new Date().toISOString(),
        },
      });

    if (!failedPayment) {
      throw new NotFoundException('Payment not found');
    }

    return this.toSimulationPaymentResponseDto('failed', failedPayment);
  }

  async handleVnpayReturn(
    query: VnpayReturnQuery,
  ): Promise<VnpayReturnResponseDto> {
    const safeQuery = this.normalizeVnpayQuery(query);

    const isValidSignature = this.vnpayService.verifyReturnUrl(safeQuery);

    if (!isValidSignature) {
      throw new BadRequestException('Invalid VNPay signature');
    }

    const txnRef = this.getRequiredVnpayParam(safeQuery, 'vnp_TxnRef');
    const responseCode = this.getRequiredVnpayParam(
      safeQuery,
      'vnp_ResponseCode',
    );
    const transactionStatus = this.getRequiredVnpayParam(
      safeQuery,
      'vnp_TransactionStatus',
    );

    const isSuccess = responseCode === '00' && transactionStatus === '00';

    const payment = await this.iPaymentRepository.findUniquePayment({
      txnRef,
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status === PaymentStatus.PAID) {
      return this.toVnpayReturnResponseDto('already_paid', payment);
    }

    return this.toVnpayReturnResponseDto(
      isSuccess ? 'success' : 'failed',
      payment,
    );
  }

  async handleVnpayIpn(query: VnpayReturnQuery): Promise<VnpayIpnResponseDto> {
    try {
      const safeQuery = this.normalizeVnpayQuery(query);

      const isValidSignature = this.vnpayService.verifyReturnUrl(safeQuery);

      if (!isValidSignature) {
        return this.toVnpayIpnResponseDto('97', 'Checksum failed');
      }

      const txnRef = safeQuery.vnp_TxnRef;
      const responseCode = safeQuery.vnp_ResponseCode;
      const transactionStatus = safeQuery.vnp_TransactionStatus;
      const vnpAmount = safeQuery.vnp_Amount;

      if (!txnRef) {
        return this.toVnpayIpnResponseDto('01', 'Order not found');
      }

      const payment = await this.iPaymentRepository.findUniquePayment({
        txnRef,
      });

      if (!payment) {
        return this.toVnpayIpnResponseDto('01', 'Order not found');
      }

      const isValidAmount = this.isValidVnpayAmount({
        vnpAmount,
        paymentAmount: payment.amount,
      });

      if (!isValidAmount) {
        return this.toVnpayIpnResponseDto('04', 'Amount invalid');
      }

      const isSuccess =
        responseCode === '00' &&
        (!transactionStatus || transactionStatus === '00');

      if (isSuccess) {
        const settlement =
          await this.iPaymentRepository.settlePaidPaymentAndActivateEnrollment({
            paymentId: payment.id,
            providerPaymentId: safeQuery.vnp_TransactionNo ?? null,
            providerMetadata: safeQuery,
            paidAt: new Date(),
          });

        if (!settlement) {
          return this.toVnpayIpnResponseDto('01', 'Order not found');
        }

        if (settlement.status === 'already_settled') {
          return this.toVnpayIpnResponseDto(
            '02',
            'This order has been updated to the payment status',
          );
        }

        return this.toVnpayIpnResponseDto('00', 'Success');
      }

      if (payment.status !== PaymentStatus.PENDING) {
        return this.toVnpayIpnResponseDto(
          '02',
          'This order has been updated to the payment status',
        );
      }

      const failedPayment =
        await this.iPaymentRepository.markPendingPaymentFailed(payment.id, {
          providerPaymentId: safeQuery.vnp_TransactionNo ?? null,
          providerMetadata: safeQuery,
        });

      if (failedPayment?.status !== PaymentStatus.FAILED) {
        return this.toVnpayIpnResponseDto(
          '02',
          'This order has been updated to the payment status',
        );
      }

      return this.toVnpayIpnResponseDto('00', 'Success');
    } catch (error) {
      return this.toVnpayIpnResponseDto('99', 'Unknown error');
    }
  }

  async getLearnerPayments(
    learnerId: string,
    query: GetPaymentsQueryDto = {},
  ): Promise<GetPaymentsResponseDto> {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(
      Math.max(query.limit ?? DEFAULT_PAYMENT_LIMIT, 1),
      MAX_PAYMENT_LIMIT,
    );
    const offset = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      this.iPaymentRepository.findLearnerPaymentHistory({
        learnerId,
        limit,
        offset,
      }),
      this.iPaymentRepository.countLearnerPayments(learnerId),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: plainToInstance(LearnerPaymentItemDto, payments, {
        excludeExtraneousValues: true,
      }),
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

  private normalizeVnpayQuery(query: VnpayReturnQuery): Record<string, string> {
    const result: Record<string, string> = {};

    for (const [key, value] of Object.entries(query)) {
      if (typeof value === 'string') {
        result[key] = value;
        continue;
      }

      if (Array.isArray(value)) {
        throw new BadRequestException(
          `Invalid duplicate VNPay query param: ${key}`,
        );
      }

      if (value === undefined) {
        continue;
      }

      throw new BadRequestException(`Invalid VNPay query param: ${key}`);
    }

    return result;
  }

  private getRequiredVnpayParam(
    query: Record<string, string>,
    key: string,
  ): string {
    const value = query[key];

    if (!value) {
      throw new BadRequestException(`Missing VNPay param: ${key}`);
    }

    return value;
  }

  private toVnpayReturnResponseDto(
    status: VnpayReturnResponseStatus,
    payment: PaymentModel,
  ): VnpayReturnResponseDto {
    return plainToInstance(VnpayReturnResponseDto, {
      status,
      payment: this.toPaymentResponseDto(payment),
    });
  }

  private toSimulationPaymentResponseDto(
    status: SimulationPaymentResponseStatus,
    payment: PaymentModel,
  ): SimulationPaymentResponseDto {
    return plainToInstance(SimulationPaymentResponseDto, {
      status,
      payment: this.toPaymentResponseDto(payment),
    });
  }

  private toPaymentResponseDto(payment: PaymentModel): PaymentResponseDto {
    return plainToInstance(PaymentResponseDto, {
      id: payment.id,
      userId: payment.userId,
      courseId: payment.courseId,
      amount: payment.amount,
      currency: payment.currency,
      paymentMethod: payment.paymentMethod,
      status: payment.status,
      provider: payment.provider,
      txnRef: payment.txnRef,
      providerPaymentId: payment.providerPaymentId,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    });
  }

  private toVnpayIpnResponseDto(
    RspCode: VnpayIpnRspCode,
    Message: string,
  ): VnpayIpnResponseDto {
    return plainToInstance(VnpayIpnResponseDto, {
      RspCode,
      Message,
    });
  }

  private isValidVnpayAmount(input: {
    vnpAmount: string | undefined;
    paymentAmount: number;
  }): boolean {
    if (!input.vnpAmount) {
      return false;
    }

    const vnpAmount = Number(input.vnpAmount);

    if (!Number.isFinite(vnpAmount)) {
      return false;
    }

    return vnpAmount === input.paymentAmount * 100;
  }

  private async findOwnedSimulationPayment(
    userId: string,
    paymentId: string,
  ): Promise<PaymentModel> {
    const payment = await this.iPaymentRepository.findUniquePayment({
      id: paymentId,
    });

    if (
      !payment ||
      payment.userId !== userId ||
      payment.paymentMethod !== PaymentMethod.SIMULATION ||
      payment.provider !== 'SIMULATION'
    ) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }
}
