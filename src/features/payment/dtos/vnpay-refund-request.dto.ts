// src/features/payments/dtos/vnpay-refund-request.dto.ts

import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export enum VnpayRefundTransactionType {
  FULL_REFUND = '02',
  PARTIAL_REFUND = '03',
}

export class VnpayRefundRequestDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  paymentId!: string;

  /**
   * Amount in VND.
   * Example: 100000 means 100,000 VND.
   * VNPay payload will send amount * 100.
   */
  @IsInt()
  @Min(1)
  amount!: number;

  @IsEnum(VnpayRefundTransactionType)
  transactionType!: VnpayRefundTransactionType;

  @IsOptional()
  @IsString()
  reason?: string;
}
