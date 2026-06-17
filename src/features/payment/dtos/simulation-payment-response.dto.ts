import { PaymentResponseDto } from './vnpay-return-response.dto';

export type SimulationPaymentResponseStatus =
  | 'pending'
  | 'success'
  | 'failed'
  | 'already_paid';

export class SimulationPaymentResponseDto {
  status!: SimulationPaymentResponseStatus;
  payment!: PaymentResponseDto;
}
