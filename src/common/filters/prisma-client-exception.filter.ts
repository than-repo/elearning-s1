// src/filters/prisma-client-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Response, Request } from 'express';
import { Prisma } from 'generated/prisma/client';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(PrismaClientExceptionFilter.name);

  catch(
    exception: Prisma.PrismaClientKnownRequestError,
    host: ArgumentsHost,
  ): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { code, meta } = exception;
    const entity = (meta?.modelName as string) ?? 'Record';

    switch (code) {
      case 'P2025': {
        const message = `${entity} not found`;

        return this.sendError(
          response,
          request,
          HttpStatus.NOT_FOUND,
          message,
          'Not Found',
        );
      }

      case 'P2002': {
        const target = meta?.target as string[] | undefined;
        const fields = Array.isArray(target) ? target.join(', ') : 'field';

        return this.sendError(
          response,
          request,
          HttpStatus.CONFLICT,
          `${entity} with this ${fields} already exists`,
          'Conflict',
        );
      }

      case 'P2003':
        return this.sendError(
          response,
          request,
          HttpStatus.BAD_REQUEST,
          `Invalid reference in ${entity}`,
          'Bad Request',
        );

      case 'P2014':
      case 'P2016':
        return this.sendError(
          response,
          request,
          HttpStatus.BAD_REQUEST,
          `Invalid data for ${entity}`,
          'Bad Request',
        );

      default:
        this.logger.error(
          `[Prisma Error] Code: ${code} at ${request.url}`,
          exception.stack,
        );

        return this.sendError(
          response,
          request,
          HttpStatus.INTERNAL_SERVER_ERROR,
          `Database error occurred while processing ${entity}`,
          'Internal Server Error',
        );
    }
  }

  private sendError(
    response: Response,
    request: Request,
    statusCode: number,
    message: string,
    error: string,
  ): void {
    response.status(statusCode).json({
      success: false,
      statusCode,
      timestamp: new Date().toISOString(),
      path: request.originalUrl || request.url,
      message,
      error,
    });
  }
}
