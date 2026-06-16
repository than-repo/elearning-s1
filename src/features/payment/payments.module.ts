import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentsService } from './services/payments.service';
import { VnpayService } from './services/vnpay.service';
import { PaymentRepository } from './repositories/payment.repository';
import { PAYMENT_REPOSITORY } from './repositories/payment.repository.token';
import { PaymentsController } from './payments.controller';
import vnpayConfig from 'src/config/vnpay.config';

@Module({
  providers: [
    PaymentsService,
    VnpayService,
    { provide: PAYMENT_REPOSITORY, useClass: PaymentRepository },
  ],
  imports: [ConfigModule.forFeature(vnpayConfig)],
  controllers: [PaymentsController],
  exports: [],
})
export class PaymentsModule {}
