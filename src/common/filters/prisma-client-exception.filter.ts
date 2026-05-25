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
        const where = meta?.where as
          | { id?: string | number }
          | Array<{ id?: string | number }>
          | undefined;

        const id = Array.isArray(where) ? where[0]?.id : where?.id;

        const message = id
          ? `${entity} with id "${id}" not found`
          : `${entity} not found`;

        response.status(HttpStatus.NOT_FOUND).json({
          statusCode: HttpStatus.NOT_FOUND,
          message,
          error: 'Not Found',
        });
        break;
      }

      case 'P2002': {
        const target = meta?.target as string[] | undefined;
        const fields = Array.isArray(target) ? target.join(', ') : 'field';

        response.status(HttpStatus.CONFLICT).json({
          statusCode: HttpStatus.CONFLICT,
          message: `${entity} with this ${fields} already exists`,
          error: 'Conflict',
        });
        break;
      }

      case 'P2003':
        response.status(HttpStatus.BAD_REQUEST).json({
          statusCode: HttpStatus.BAD_REQUEST,
          message: `Invalid reference in ${entity}`,
          error: 'Bad Request',
        });
        break;

      case 'P2014':
      case 'P2016':
        response.status(HttpStatus.BAD_REQUEST).json({
          statusCode: HttpStatus.BAD_REQUEST,
          message: `Invalid data for ${entity}`,
          error: 'Bad Request',
        });
        break;

      default:
        this.logger.error(
          `[Prisma Error] Code: ${code} at ${request.url}`,
          exception.stack,
        );

        response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: `Database error occurred while processing ${entity}`,
          error: 'Bad Request',
        });
        break;
    }
  }
}
