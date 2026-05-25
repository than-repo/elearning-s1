import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { PrismaClientExceptionFilter } from './common/filters/prisma-client-exception.filter';
import helmet from 'helmet';
import { urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip unknown properties
      forbidNonWhitelisted: true, // throw error on unknown properties
      transform: true, // auto-transform payloads to DTO instances
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Swagger Example')
    .setDescription('The Elearning API description')
    .setVersion('1.0')
    .addTag('E-l')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  app.use(cookieParser());

  app.enableCors({ credentials: true });

  app.useGlobalFilters(new PrismaClientExceptionFilter());

  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
  });

  app.use(helmet());

  app.use(urlencoded({ extended: true, limit: '2mb' }));

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
