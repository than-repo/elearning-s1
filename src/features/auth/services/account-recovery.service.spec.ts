jest.mock(
  'generated/prisma/enums',
  () => ({
    AuthProviderEnum: {
      LOCAL: 'LOCAL',
      GOOGLE: 'GOOGLE',
    },
  }),
  { virtual: true },
);

jest.mock(
  'src/core/database/prisma.service',
  () => ({
    PrismaService: class PrismaService {},
  }),
  { virtual: true },
);

jest.mock(
  'src/core/mailer/mailer.service',
  () => ({
    MailerService: class MailerService {},
  }),
  { virtual: true },
);

jest.mock(
  'bcrypt',
  () => ({
    hash: jest.fn(),
  }),
  { virtual: true },
);

import { Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { AuthProviderEnum } from 'generated/prisma/enums';

import { AuthRepository } from '../repositories/auth.repository';
import { AccountRecoveryService } from './account-recovery.service';
import { MailerService } from 'src/core/mailer/mailer.service';

type AuthRepositoryMock = jest.Mocked<
  Pick<
    AuthRepository,
    | 'findUserByEmailWithIdentities'
    | 'invalidateUnusedPasswordResetTokens'
    | 'createPasswordResetToken'
    | 'resetPassword'
  >
>;

type ConfigServiceMock = jest.Mocked<Pick<ConfigService, 'get' | 'getOrThrow'>>;
type MailerServiceMock = jest.Mocked<Pick<MailerService, 'sendPasswordResetEmail'>>;

const userId = '11111111-1111-4111-8111-111111111111';
const email = 'user@example.com';

describe('AccountRecoveryService', () => {
  let service: AccountRecoveryService;
  let authRepository: AuthRepositoryMock;
  let configService: ConfigServiceMock;
  let mailerService: MailerServiceMock;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    loggerErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    authRepository = {
      findUserByEmailWithIdentities: jest.fn(),
      invalidateUnusedPasswordResetTokens: jest.fn().mockResolvedValue(undefined),
      createPasswordResetToken: jest.fn().mockResolvedValue({}),
      resetPassword: jest.fn(),
    };
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'PASSWORD_RESET_EXPIRES_MINUTES') return '15';
        return undefined;
      }),
      getOrThrow: jest.fn((key: string) => {
        if (key === 'PASSWORD_SALT_ROUNDS') return '10';
        if (key === 'FRONTEND_URL') return 'http://localhost:3001';
        throw new Error(`Missing config: ${key}`);
      }),
    };
    mailerService = {
      sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    };

    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

    service = new AccountRecoveryService(
      authRepository as unknown as AuthRepository,
      configService as unknown as ConfigService,
      mailerService as unknown as MailerService,
    );
  });

  afterEach(() => {
    loggerErrorSpy.mockRestore();
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('returns without sending email when the email is unknown', async () => {
    authRepository.findUserByEmailWithIdentities.mockResolvedValue(null);

    await expect(service.forgotPassword(email)).resolves.toBeUndefined();

    expect(authRepository.createPasswordResetToken).not.toHaveBeenCalled();
    expect(mailerService.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('returns without sending email when the user is inactive', async () => {
    authRepository.findUserByEmailWithIdentities.mockResolvedValue(
      makeUser({ isActive: false }),
    );

    await expect(service.forgotPassword(email)).resolves.toBeUndefined();

    expect(authRepository.createPasswordResetToken).not.toHaveBeenCalled();
    expect(mailerService.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('returns without sending email for Google-only users', async () => {
    authRepository.findUserByEmailWithIdentities.mockResolvedValue(
      makeUser({
        passwordHash: null,
        identities: [{ provider: AuthProviderEnum.GOOGLE }],
      }),
    );

    await expect(service.forgotPassword(email)).resolves.toBeUndefined();

    expect(authRepository.createPasswordResetToken).not.toHaveBeenCalled();
    expect(mailerService.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('invalidates older unused tokens and sends a reset email for local users', async () => {
    authRepository.findUserByEmailWithIdentities.mockResolvedValue(makeUser());

    await service.forgotPassword(email);

    expect(authRepository.invalidateUnusedPasswordResetTokens).toHaveBeenCalledWith(
      userId,
    );
    expect(authRepository.createPasswordResetToken).toHaveBeenCalledWith({
      userId,
      tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      expiresAt: new Date('2026-01-01T00:15:00.000Z'),
    });
    expect(mailerService.sendPasswordResetEmail).toHaveBeenCalledWith(
      email,
      expect.stringMatching(
        /^http:\/\/localhost:3001\/reset-password\?token=[a-f0-9]{64}$/,
      ),
    );
    expect(
      authRepository.invalidateUnusedPasswordResetTokens.mock.invocationCallOrder[0],
    ).toBeLessThan(
      authRepository.createPasswordResetToken.mock.invocationCallOrder[0],
    );
  });

  it('does not expose mail delivery failures from forgot password', async () => {
    authRepository.findUserByEmailWithIdentities.mockResolvedValue(makeUser());
    mailerService.sendPasswordResetEmail.mockRejectedValue(
      new Error('SMTP unavailable'),
    );

    await expect(service.forgotPassword(email)).resolves.toBeUndefined();

    expect(authRepository.createPasswordResetToken).toHaveBeenCalled();
  });

  it('throws unauthorized when reset token consumption fails', async () => {
    authRepository.resetPassword.mockResolvedValue(false);

    await expect(service.resetPassword('reset-token', '@Abcd123')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('hashes the new password and atomically resets by token hash', async () => {
    authRepository.resetPassword.mockResolvedValue(true);

    await service.resetPassword('reset-token', '@Abcd123');

    expect(bcrypt.hash).toHaveBeenCalledWith('@Abcd123', 10);
    expect(authRepository.resetPassword).toHaveBeenCalledWith({
      tokenHash: createHash('sha256').update('reset-token').digest('hex'),
      passwordHash: 'hashed-password',
    });
  });
});

function makeUser(
  overrides: Partial<{
    isActive: boolean;
    passwordHash: string | null;
    identities: Array<{ provider: AuthProviderEnum }>;
  }> = {},
) {
  return {
    id: userId,
    email,
    fullName: 'Example User',
    passwordHash: 'current-password-hash',
    isActive: true,
    identities: [{ provider: AuthProviderEnum.LOCAL }],
    ...overrides,
  } as Awaited<ReturnType<AuthRepository['findUserByEmailWithIdentities']>>;
}
