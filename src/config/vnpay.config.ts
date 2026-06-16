// src/config/vnpay.config.ts

import { registerAs } from '@nestjs/config';

export default registerAs('vnpay', () => ({
  tmnCode: getRequiredEnv('VNPAY_TMN_CODE'),
  hashSecret: getRequiredEnv('VNPAY_HASH_SECRET'),
  paymentUrl: getRequiredUrlEnv('VNPAY_PAYMENT_URL'),
  returnUrl: getRequiredUrlEnv('VNPAY_RETURN_URL'),
}));

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getRequiredUrlEnv(name: string): string {
  const value = getRequiredEnv(name);

  try {
    const url = new URL(value);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error();
    }

    return value;
  } catch (error) {
    throw new Error(`Invalid URL environment variable: ${name}`);
  }
}
