jest.mock(
  'generated/prisma/enums',
  () => ({
    AuthProviderEnum: {
      LOCAL: 'LOCAL',
      GOOGLE: 'GOOGLE',
    },
    UserRole: {
      LEARNER: 'LEARNER',
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

import { AuthProviderEnum } from 'generated/prisma/enums';

import { AuthRepository } from './auth.repository';

type PasswordResetTokenDelegateMock = {
  create: jest.Mock;
  findFirst: jest.Mock;
  update: jest.Mock;
  updateMany: jest.Mock;
};

type UserDelegateMock = {
  findUnique: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
};

type RefreshTokenDelegateMock = {
  create: jest.Mock;
  findFirst: jest.Mock;
  update: jest.Mock;
  updateMany: jest.Mock;
};

type UserIdentityDelegateMock = {
  create: jest.Mock;
  update: jest.Mock;
};

type TransactionClientMock = {
  passwordResetToken: Pick<
    PasswordResetTokenDelegateMock,
    'findFirst' | 'updateMany'
  >;
  user: Pick<UserDelegateMock, 'update'>;
  refreshToken: Pick<RefreshTokenDelegateMock, 'updateMany'>;
};

type PrismaServiceMock = {
  user: UserDelegateMock;
  userIdentity: UserIdentityDelegateMock;
  refreshToken: RefreshTokenDelegateMock;
  passwordResetToken: PasswordResetTokenDelegateMock;
  $transaction: jest.Mock;
};

const userId = '11111111-1111-4111-8111-111111111111';
const resetTokenId = '22222222-2222-4222-8222-222222222222';

describe('AuthRepository password reset', () => {
  let repository: AuthRepository;
  let prisma: PrismaServiceMock;
  let tx: TransactionClientMock;

  beforeEach(() => {
    tx = {
      passwordResetToken: {
        findFirst: jest.fn(),
        updateMany: jest.fn(),
      },
      user: {
        update: jest.fn(),
      },
      refreshToken: {
        updateMany: jest.fn(),
      },
    };

    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      userIdentity: {
        create: jest.fn(),
        update: jest.fn(),
      },
      refreshToken: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      passwordResetToken: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn(
        (callback: (client: TransactionClientMock) => unknown) => callback(tx),
      ),
    };

    repository = new AuthRepository(
      prisma as unknown as ConstructorParameters<typeof AuthRepository>[0],
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('invalidates unused password reset tokens for a user', async () => {
    await repository.invalidateUnusedPasswordResetTokens(userId);

    expect(prisma.passwordResetToken.updateMany).toHaveBeenCalledWith({
      where: {
        userId,
        usedAt: null,
      },
      data: {
        usedAt: expect.any(Date),
      },
    });
  });

  it('consumes a valid reset token, updates password, and revokes sessions atomically', async () => {
    tx.passwordResetToken.findFirst.mockResolvedValue({
      id: resetTokenId,
      userId,
    });
    tx.passwordResetToken.updateMany.mockResolvedValue({ count: 1 });

    const result = await repository.resetPassword({
      tokenHash: 'token-hash',
      passwordHash: 'new-password-hash',
    });

    expect(result).toBe(true);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.passwordResetToken.findFirst).toHaveBeenCalledWith({
      where: {
        tokenHash: 'token-hash',
        usedAt: null,
        expiresAt: {
          gt: expect.any(Date),
        },
        user: {
          isActive: true,
          passwordHash: {
            not: null,
          },
          identities: {
            some: {
              provider: AuthProviderEnum.LOCAL,
            },
          },
        },
      },
      select: {
        id: true,
        userId: true,
      },
    });
    expect(tx.passwordResetToken.updateMany).toHaveBeenCalledWith({
      where: {
        id: resetTokenId,
        usedAt: null,
        expiresAt: {
          gt: expect.any(Date),
        },
      },
      data: {
        usedAt: expect.any(Date),
      },
    });
    expect(tx.user.update).toHaveBeenCalledWith({
      where: {
        id: userId,
      },
      data: {
        passwordHash: 'new-password-hash',
      },
    });
    expect(tx.refreshToken.updateMany).toHaveBeenCalledWith({
      where: {
        userId,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
      },
    });
  });

  it('returns false when no valid unused reset token exists', async () => {
    tx.passwordResetToken.findFirst.mockResolvedValue(null);

    const result = await repository.resetPassword({
      tokenHash: 'token-hash',
      passwordHash: 'new-password-hash',
    });

    expect(result).toBe(false);
    expect(tx.passwordResetToken.updateMany).not.toHaveBeenCalled();
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(tx.refreshToken.updateMany).not.toHaveBeenCalled();
  });

  it('returns false when the token was already consumed concurrently', async () => {
    tx.passwordResetToken.findFirst.mockResolvedValue({
      id: resetTokenId,
      userId,
    });
    tx.passwordResetToken.updateMany.mockResolvedValue({ count: 0 });

    const result = await repository.resetPassword({
      tokenHash: 'token-hash',
      passwordHash: 'new-password-hash',
    });

    expect(result).toBe(false);
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(tx.refreshToken.updateMany).not.toHaveBeenCalled();
  });
});
