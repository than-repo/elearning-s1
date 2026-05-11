//src\features\auth\repositories\auth.repository.ts
import { ConfigService } from '@nestjs/config';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/core/database/prisma.service';
import { AuthProviderEnum, UserRole } from 'generated/prisma/enums';

import { createHash } from 'node:crypto';
import * as crypto from 'node:crypto';
import { CreateLocalUserData } from '../interfaces/create-local-user.interface';
import { CreateRefreshToken } from '../interfaces/create-refresh-token.interface';
import { CreateGoogleUserData } from '../interfaces/create-google-user.interface';

@Injectable()
export class AuthRepository {
  private readonly SALT_ROUNDS = 12;
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find user by email and include identities (used in register + login)
   */
  async findUserByEmailWithIdentities(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        identities: true,
      },
    });
  }

  /**
   * Create new local user + UserIdentity in a single transaction
   * This is critical for data consistency.
   */
  async createLocalUser(data: CreateLocalUserData) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Create the User
      const user = await tx.user.create({
        data: {
          fullName: data.fullName.trim(),
          email: data.email.toLowerCase().trim(),
          passwordHash: data.passwordHash,
          phoneNumber: data.phoneNumber?.trim() || null,
          dateOfBirth: data.dateOfBirth || null,
          gender: data.gender || null,
          role: UserRole.LEARNER, // default role for new registrations
        },
      });

      // 2. Create UserIdentity (LOCAL provider)
      await tx.userIdentity.create({
        data: {
          userId: user.id,
          provider: AuthProviderEnum.LOCAL,
          providerId: user.id, // for local auth we use user.id as providerId
        },
      });

      // 3. Return the full user (with role, etc.)
      return user;
    });
  }

  /**
   * Create a new refresh token (secure random + hashed)
   */

  async createRefreshToken(data: CreateRefreshToken) {
    const refreshToken = crypto.randomBytes(64).toString('hex'); // plain token sent to client
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');

    const refresh = await this.prisma.refreshToken.create({
      data: {
        userId: data.userId,
        tokenHash,
        expiresAt: data.expiresAt,
        deviceInfo: data.deviceInfo || null,
        ipAddress: data.ipAddress || null,
      },
    });

    return {
      refreshToken,
      refreshTokenId: refresh.id,
    };
  }

  async findRefreshTokenByToken(refreshToken: string) {
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');

    const refreshTokenRecord = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            isActive: true,
            // emailVerified: false, ///Update verify Email feature later
          },
        },
      },
    });

    if (!refreshTokenRecord?.user) {
      return null;
    }

    // Security: validate user status even on refresh
    if (
      !refreshTokenRecord.user.isActive
      // || !refreshTokenRecord.user.emailVerified
    ) {
      throw new UnauthorizedException(
        'User account is inactive or email not verified',
      );
    }

    return refreshTokenRecord;
  }

  async revokeToken(refreshTokenId: string) {
    return this.prisma.refreshToken.update({
      where: { id: refreshTokenId },
      data: {
        isRevoked: true,
      },
    });
  }
  /*
   *used on logout all device later
   */
  async revokeAllUserRefreshTokens(userId: string) {
    return this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: {
        isRevoked: true,
      },
    });
  }

  /**
   *Find user by ID (used by Google login flow)
   */
  async findUserById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId, isActive: true },
      include: {
        identities: true,
      },
    });
  }

  async findOrCreateGoogleUser(data: CreateGoogleUserData) {
    const emailLower = data.email.toLowerCase();

    return this.prisma.$transaction(async (tx) => {
      // 1. Check if user already exists by email
      let user = await tx.user.findUnique({
        where: { email: emailLower },
        include: { identities: true },
      });

      if (user) {
        // User exists -> check if Google identity is already linked
        const googleIdentity = user.identities.find(
          (id) =>
            id.provider === AuthProviderEnum.GOOGLE &&
            id.providerId === data.googleId,
        );

        if (!googleIdentity) {
          // Link Google account to existing user
          await tx.userIdentity.create({
            data: {
              userId: user.id,
              provider: AuthProviderEnum.GOOGLE,
              providerId: data.googleId,
              accessToken: data.accessToken,
              refreshToken: data.refreshToken || null,
            },
          });
        } else {
          // Update existing Google identity tokens
          await tx.userIdentity.update({
            where: { id: googleIdentity.id },
            data: {
              accessToken: data.accessToken,
              refreshToken: data.refreshToken || null,
              lastUsedAt: new Date(),
            },
          });
        }

        // Update user avatar if not set
        if (!user.avatarUrl && data.avatarUrl) {
          user = await tx.user.update({
            where: { id: user.id },
            data: { avatarUrl: data.avatarUrl },
            include: { identities: true },
          });
        }

        return user;
      }

      // 2. No user exists => create brand new user + Google identity
      user = await tx.user.create({
        data: {
          fullName: data.fullName.trim(),
          email: emailLower,
          avatarUrl: data.avatarUrl || null,
          role: UserRole.LEARNER,
          isActive: true,
          emailVerified: true, // Google accounts are considered verified
        },
        include: { identities: true },
      });

      await tx.userIdentity.create({
        data: {
          userId: user.id,
          provider: AuthProviderEnum.GOOGLE,
          providerId: data.googleId,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken || null,
        },
      });

      return user;
    });
  }
}
