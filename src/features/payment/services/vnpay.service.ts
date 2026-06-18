// src/payments/vnpay.service.ts
import type { ConfigType } from '@nestjs/config';

import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import vnpayConfig from 'src/config/vnpay.config';

export type VnpayLocale = 'vn' | 'en';

export interface CreateVnpayPaymentUrlParams {
  txnRef: string;
  amount: number; // VND amount, example: 100000
  orderInfo: string;
  ipAddr: string;
  bankCode?: string;
  locale?: VnpayLocale;
}

@Injectable()
export class VnpayService {
  constructor(
    @Inject(vnpayConfig.KEY)
    private readonly vnpay: ConfigType<typeof vnpayConfig>,
  ) {}

  createPaymentUrl(params: CreateVnpayPaymentUrlParams): string {
    if (!Number.isInteger(params.amount) || params.amount <= 0) {
      throw new BadRequestException('Invalid VNPay amount');
    }

    const now = new Date();
    const createDate = this.formatVnpDate(now);
    const expireDate = this.formatVnpDate(
      new Date(now.getTime() + 15 * 60 * 1000),
    );

    const vnpParams: Record<string, string | number> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: this.vnpay.tmnCode,
      vnp_Locale: params.locale || 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: params.txnRef,
      vnp_OrderInfo: params.orderInfo,
      vnp_OrderType: 'other',
      vnp_Amount: params.amount * 100,
      vnp_ReturnUrl: this.vnpay.returnUrl,
      vnp_IpAddr: params.ipAddr,
      vnp_CreateDate: createDate,
      vnp_ExpireDate: expireDate,
    };

    const bankCode = params.bankCode?.trim();

    if (bankCode) {
      vnpParams.vnp_BankCode = bankCode;
    }

    const searchParams = this.buildSortedSearchParams(vnpParams);
    const signData = searchParams.toString();

    const secureHash = crypto
      .createHmac('sha512', this.vnpay.hashSecret)
      .update(Buffer.from(signData, 'utf-8'))
      .digest('hex');

    searchParams.append('vnp_SecureHash', secureHash);

    return `${this.vnpay.paymentUrl}?${searchParams.toString()}`;
  }

  verifyReturnUrl(query: Record<string, any>): boolean {
    const copiedQuery = { ...query };

    const secureHash = copiedQuery.vnp_SecureHash;

    delete copiedQuery.vnp_SecureHash;
    delete copiedQuery.vnp_SecureHashType;

    const searchParams = this.buildSortedSearchParams(copiedQuery);
    const signData = searchParams.toString();

    const checkHash = crypto
      .createHmac('sha512', this.vnpay.hashSecret)
      .update(Buffer.from(signData, 'utf-8'))
      .digest('hex');

    return secureHash === checkHash;
  }

  private buildSortedSearchParams(
    obj: Record<string, unknown>,
  ): URLSearchParams {
    const params = new URLSearchParams();

    Object.keys(obj)
      .sort()
      .forEach((key) => {
        const value = obj[key];

        if (value === undefined || value === null || value === '') {
          return;
        }

        // Should add encodeURI for security
        params.append(key, this.toVnpayString(value));
      });

    return params;
  }

  private toVnpayString(value: unknown): string {
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return String(value);
    }

    if (Array.isArray(value)) {
      return String(value[0] ?? '');
    }

    throw new Error('Invalid VNPay parameter value');
  }

  private formatDate(date: Date): string {
    const yyyy = date.getFullYear().toString();
    const MM = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const HH = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');

    return `${yyyy}${MM}${dd}${HH}${mm}${ss}`;
  }

  private formatVnpDate(date: Date): string {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      hourCycle: 'h23',
    }).formatToParts(date);

    const get = (type: string): string => {
      const value = parts.find((part) => part.type === type)?.value;

      if (!value) {
        throw new Error(`Cannot format VNPay date part: ${type}`);
      }

      return value;
    };

    return `${get('year')}${get('month')}${get('day')}${get('hour')}${get(
      'minute',
    )}${get('second')}`;
  }
}
