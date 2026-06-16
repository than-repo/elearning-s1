import { Module } from '@nestjs/common';
import { PrismaModule } from './core/database/prisma.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ResponseFormattingInterceptor } from './common/interceptors/response-formatting.interceptor';
import { AuthModule } from './features/auth/auth.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { UsersModule } from './features/users/users.module';
import { ScheduleModule } from '@nestjs/schedule';
import { UploadModule } from './features/upload/upload.module';
import { CoursesModule } from './features/courses/courses.module';
import { EnrollmentsModule } from './features/enrollments/enrollments.module';
import { LearningModule } from './features/learning/learning.module';
import { PaymentsModule } from './features/payment/payments.module';
import vnpayConfig from './config/vnpay.config';

@Module({
  imports: [
    // Production rate limiting for auth endpoints
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.getOrThrow<number>('THROTTLE_TTL'),
          limit: configService.getOrThrow<number>('THROTTLE_LIMIT'),
        },
      ],
    }),
    //.deveplopment.env
    ConfigModule.forRoot({
      envFilePath: '.development.env',
      isGlobal: true,
      load: [vnpayConfig],
    }),
    UsersModule,
    PrismaModule,
    AuthModule,
    ScheduleModule.forRoot(),
    UploadModule,
    CoursesModule,
    EnrollmentsModule,
    LearningModule,
    PaymentsModule,
  ],
  controllers: [],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: ResponseFormattingInterceptor },

    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
