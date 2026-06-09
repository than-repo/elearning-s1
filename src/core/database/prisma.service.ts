// src/core/database/prisma.service.ts
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from 'generated/prisma/client';
import { Global, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

@Global()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(private readonly ConfigService: ConfigService) {
    const databaseUrl = ConfigService.get<string>('DATABASE_URL');
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is missing in .development.env');
    }

    const url = new URL(databaseUrl);

    const adapter = new PrismaMariaDb({
      host: url.hostname,
      port: url.port ? parseInt(url.port, 10) : 3306,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1),
      connectionLimit: 10,
      allowPublicKeyRetrieval: true, // fixes RSA error
    });

    super({ adapter });
  }
  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Prisma connected to MySql successfully');

    const user = await this.user.count();
    this.logger.log(`Prisma test OK - User: ${user}`);
  }
  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Prisma disconnected');
  }
}
