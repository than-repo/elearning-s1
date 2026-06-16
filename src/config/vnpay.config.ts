// src/config/vnpay.config.ts

import { registerAs } from '@nestjs/config';

export default registerAs('vnpay', () => ({
  tmnCode: process.env.VNPAY_TMN_CODE!,
  hashSecret: process.env.VNPAY_HASH_SECRET!,
  paymentUrl: process.env.VNPAY_PAYMENT_URL!,
  returnUrl: process.env.VNPAY_RETURN_URL!,
}));
