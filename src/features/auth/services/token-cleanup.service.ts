import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/core/database/prisma.service';

@Injectable()
export class TokenCleanupService {
  private readonly logger = new Logger(TokenCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Runs every day at 3:00 AM Vietnam time
  @Cron(CronExpression.EVERY_DAY_AT_3AM, {
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  async cleanupExpiredAndRevokedTokens() {
    this.logger.log('Starting refresh token cleanup...');

    const result = await this.prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { isRevoked: true },
          {
            expiresAt: { lt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30) }, // 30 days
          },
        ],
      },
    });

    this.logger.log(`Deleted ${result.count} refresh tokens`);
  }

  // Runs every Sunday at 3:00 AM Vietnam time
  @Cron(CronExpression.EVERY_WEEK, {
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  async aggressiveCleanup() {
    const result = await this.prisma.refreshToken.deleteMany({
      where: {
        expiresAt: { lt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90) }, // 90 days
      },
    });

    this.logger.log(`Aggressive cleanup: Deleted ${result.count} old tokens`);
  }
  //Test
  //   @Cron(CronExpression.EVERY_10_SECONDS)
  //   async testScheduleModule() {
  //     console.log(new Date());
  //   }
}
