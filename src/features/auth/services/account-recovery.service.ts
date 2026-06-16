import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthRepository } from '../repositories/auth.repository';
import { createHash, randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { MailerService } from 'src/core/mailer/mailer.service';
import { AuthProviderEnum } from 'generated/prisma/enums';

type UserWithIdentities = Awaited<
  ReturnType<AuthRepository['findUserByEmailWithIdentities']>
>;

@Injectable()
export class AccountRecoveryService {
  private readonly logger = new Logger(AccountRecoveryService.name);
  private readonly saltRounds: number;
  private readonly passwordResetExpiresMs: number;

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly configService: ConfigService,
    private readonly mailService: MailerService,
  ) {
    this.saltRounds = this.parseSaltRounds();
    this.passwordResetExpiresMs = this.parsePasswordResetExpiresMs();
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = createHash('sha256').update(token).digest('hex');

    const passwordHash = await bcrypt.hash(newPassword, this.saltRounds);

    const wasReset = await this.authRepository.resetPassword({
      tokenHash,
      passwordHash,
    });

    if (!wasReset) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }
  }

  async forgotPassword(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();
    const user =
      await this.authRepository.findUserByEmailWithIdentities(normalizedEmail);

    if (!this.canRequestPasswordReset(user)) {
      return;
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    const expiresAt = new Date(Date.now() + this.passwordResetExpiresMs);

    await this.authRepository.invalidateUnusedPasswordResetTokens(user.id);
    await this.authRepository.createPasswordResetToken({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');

    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

    try {
      await this.mailService.sendPasswordResetEmail(user.email, resetUrl);
    } catch (error) {
      this.logger.error(
        'Failed to send password reset email',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private canRequestPasswordReset(
    user: UserWithIdentities,
  ): user is NonNullable<UserWithIdentities> {
    return Boolean(
      user?.isActive &&
        user.passwordHash &&
        user.identities.some(
          (identity) => identity.provider === AuthProviderEnum.LOCAL,
        ),
    );
  }

  private parseSaltRounds(): number {
    const rounds = parseInt(
      String(this.configService.getOrThrow('PASSWORD_SALT_ROUNDS')),
      10,
    );

    if (Number.isNaN(rounds) || rounds < 10) {
      throw new Error('PASSWORD_SALT_ROUNDS must be a number >= 10');
    }

    return rounds;
  }

  private parsePasswordResetExpiresMs(): number {
    const minutes = parseInt(
      String(this.configService.get('PASSWORD_RESET_EXPIRES_MINUTES') ?? '15'),
      10,
    );

    if (Number.isNaN(minutes) || minutes <= 0) {
      throw new Error('PASSWORD_RESET_EXPIRES_MINUTES must be a positive number');
    }

    return minutes * 60 * 1000;
  }
}
