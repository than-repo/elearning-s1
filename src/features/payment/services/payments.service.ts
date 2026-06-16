// src/payments/payments.service.ts

import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { VnpayService } from './vnpay.service';
import { CreateVnpayPaymentDto } from '../dtos/create-vnpay-payment.dto';

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
} from '../dtos/vnpay-return-response.dto';
import { plainToInstance } from 'class-transformer';
import {
  VnpayIpnResponseDto,
  VnpayIpnRspCode,
} from '../dtos/vnpay-inp-response.dto';
import { randomUUID } from 'crypto';
import { PAYMENT_REPOSITORY } from '../repositories/payment.repository.token';

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

    const txnRef = this.generateTxnRef();

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
      orderInfo: `Thanh toan khoa hoc: ${course.id}`,
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

  private generateTxnRef(): string {
    return `PAY_${Date.now()}_${randomUUID()}`;
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

      const failedPayment = await this.iPaymentRepository.markPendingPaymentFailed(
        payment.id,
        {
          providerPaymentId: safeQuery.vnp_TransactionNo ?? null,
          providerMetadata: safeQuery,
        },
      );

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
      payment: {
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
      },
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
}
