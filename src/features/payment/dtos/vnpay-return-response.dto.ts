import { PaymentMethod, PaymentStatus } from 'generated/prisma/enums';

export class PaymentResponseDto {
  id!: string;
  userId!: string;
  courseId!: string;

  amount!: number;
  currency!: string;

  paymentMethod!: PaymentMethod;
  status!: PaymentStatus;

  provider!: string;
  txnRef!: string | null;

  providerPaymentId!: string | null;
  paidAt!: Date | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export type VnpayReturnResponseStatus = 'success' | 'failed' | 'already_paid';

export class VnpayReturnResponseDto {
  status!: VnpayReturnResponseStatus;
  payment!: PaymentResponseDto;
}
