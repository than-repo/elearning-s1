jest.mock(
  'src/config/vnpay.config',
  () => ({
    __esModule: true,
    default: {
      KEY: 'vnpay',
    },
  }),
  { virtual: true },
);

import { HashAlgorithm } from 'vnpay/enums';
import { calculateSecureHash } from 'vnpay/utils';

import { VnpayService } from './vnpay.service';

describe('VnpayService', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  describe('createPaymentUrl', () => {
    it('signs payment URL params with the expected VNPay checksum', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-06-16T01:30:45.000Z'));

      const service = new VnpayService({
        tmnCode: 'TEST12345',
        hashSecret: 'TEST_HASH_SECRET',
        paymentUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
        returnUrl: 'https://example.com/payments/vnpay/return',
      } as ConstructorParameters<typeof VnpayService>[0]);

      const paymentUrl = service.createPaymentUrl({
        txnRef: 'ORDER123',
        amount: 100000,
        orderInfo: 'Payment for order ORDER123',
        ipAddr: '127.0.0.1',
        locale: 'vn',
      });

      const url = new URL(paymentUrl);
      const query = url.searchParams;

      expect(url.origin + url.pathname).toBe(
        'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
      );
      expect(query.get('vnp_Amount')).toBe('10000000');
      expect(query.get('vnp_Command')).toBe('pay');
      expect(query.get('vnp_CreateDate')).toBe('20260616083045');
      expect(query.get('vnp_ExpireDate')).toBe('20260616084545');
      expect(query.get('vnp_CurrCode')).toBe('VND');
      expect(query.get('vnp_IpAddr')).toBe('127.0.0.1');
      expect(query.get('vnp_Locale')).toBe('vn');
      expect(query.get('vnp_OrderInfo')).toBe('Payment for order ORDER123');
      expect(query.get('vnp_OrderType')).toBe('other');
      expect(query.get('vnp_ReturnUrl')).toBe(
        'https://example.com/payments/vnpay/return',
      );
      expect(query.get('vnp_TmnCode')).toBe('TEST12345');
      expect(query.get('vnp_TxnRef')).toBe('ORDER123');
      expect(query.get('vnp_Version')).toBe('2.1.0');

      const signData = url.search
        .slice(1)
        .split('&')
        .filter((param) => !param.startsWith('vnp_SecureHash='))
        .join('&');

      expect(signData).not.toContain('undefined');
      expect(signData).toContain(
        'vnp_ReturnUrl=https%3A%2F%2Fexample.com%2Fpayments%2Fvnpay%2Freturn',
      );

      const packageOracleHash = calculateSecureHash({
        secureSecret: 'TEST_HASH_SECRET',
        data: signData,
        hashAlgorithm: HashAlgorithm.SHA512,
        bufferEncode: 'utf-8',
      });

      expect(query.get('vnp_SecureHash')).toBe(packageOracleHash);
    });
  });
});
