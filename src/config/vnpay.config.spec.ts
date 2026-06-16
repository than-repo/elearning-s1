import vnpayConfig from './vnpay.config';

const originalEnv = process.env;

describe('vnpayConfig', () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    setValidVnpayEnv();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns trimmed VNPay config values', () => {
    process.env.VNPAY_TMN_CODE = ' TEST12345 ';
    process.env.VNPAY_HASH_SECRET = ' TEST_HASH_SECRET ';
    process.env.VNPAY_PAYMENT_URL =
      ' https://sandbox.vnpayment.vn/paymentv2/vpcpay.html ';
    process.env.VNPAY_RETURN_URL =
      ' https://example.com/payments/vnpay/return ';

    expect(vnpayConfig()).toEqual({
      tmnCode: 'TEST12345',
      hashSecret: 'TEST_HASH_SECRET',
      paymentUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
      returnUrl: 'https://example.com/payments/vnpay/return',
    });
  });

  it.each([
    'VNPAY_TMN_CODE',
    'VNPAY_HASH_SECRET',
    'VNPAY_PAYMENT_URL',
    'VNPAY_RETURN_URL',
  ])('throws when %s is missing', (name) => {
    delete process.env[name];

    expect(() => vnpayConfig()).toThrow(
      `Missing required environment variable: ${name}`,
    );
  });

  it.each([
    'VNPAY_TMN_CODE',
    'VNPAY_HASH_SECRET',
    'VNPAY_PAYMENT_URL',
    'VNPAY_RETURN_URL',
  ])('throws when %s is blank', (name) => {
    process.env[name] = '   ';

    expect(() => vnpayConfig()).toThrow(
      `Missing required environment variable: ${name}`,
    );
  });

  it.each(['VNPAY_PAYMENT_URL', 'VNPAY_RETURN_URL'])(
    'throws when %s is not a valid URL',
    (name) => {
      process.env[name] = 'not-a-url';

      expect(() => vnpayConfig()).toThrow(
        `Invalid URL environment variable: ${name}`,
      );
    },
  );

  it.each(['VNPAY_PAYMENT_URL', 'VNPAY_RETURN_URL'])(
    'rejects non-http URL protocol for %s',
    (name) => {
      process.env[name] = 'ftp://example.com/vnpay';

      expect(() => vnpayConfig()).toThrow(
        `Invalid URL environment variable: ${name}`,
      );
    },
  );
});

function setValidVnpayEnv(): void {
  process.env.VNPAY_TMN_CODE = 'TEST12345';
  process.env.VNPAY_HASH_SECRET = 'TEST_HASH_SECRET';
  process.env.VNPAY_PAYMENT_URL =
    'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
  process.env.VNPAY_RETURN_URL =
    'https://example.com/payments/vnpay/return';
}
