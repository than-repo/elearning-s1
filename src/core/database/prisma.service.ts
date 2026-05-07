// src/core/database/prisma.service.ts
import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '../../../generated/prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(private readonly configService: ConfigService) {
    // Use configService (without 'this.') BEFORE super()
    const databaseUrl = configService.get<string>('DATABASE_URL');

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

    super({ adapter }); //  super() called here
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Prisma connected to MySQL database successfully');

    const userCount = await this.user.count();
    this.logger.log(`Prisma test OK - Total users: ${userCount}`);
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Prisma disconnected');
  }
}
