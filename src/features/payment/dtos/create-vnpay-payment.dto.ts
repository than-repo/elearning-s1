// src/features/payment/dtos/create-vnpay-payment.dto.ts

import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateVnpayPaymentDto {
  @IsUUID()
  courseId!: string;

  @IsOptional()
  @IsString()
  bankCode?: string;

  @IsOptional()
  @IsIn(['vn', 'en'])
  locale?: 'vn' | 'en';
}
