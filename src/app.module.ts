import { Module } from '@nestjs/common';
import { PrismaModule } from './core/database/prisma.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.development.env',
      isGlobal: true,
    }),
    PrismaModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
