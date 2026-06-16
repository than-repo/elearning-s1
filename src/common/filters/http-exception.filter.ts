// src/common/filters/http-exception.filter.ts

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { ApiErrorResponse } from '../interfaces/api-error-response.interface';

type NestHttpExceptionResponse =
  | string
  | {
      statusCode?: number;
      message?: string | string[];
      error?: string;
    };

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();

    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException
        ? (exception.getResponse() as NestHttpExceptionResponse)
        : null;

    const errorBody = this.buildErrorBody({
      exceptionResponse,
      statusCode,
      path: request.originalUrl ?? request.url,
    });

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(statusCode).json(errorBody);
  }

  private buildErrorBody(input: {
    exceptionResponse: NestHttpExceptionResponse | null;
    statusCode: number;
    path: string;
  }): ApiErrorResponse {
    const { exceptionResponse, statusCode, path } = input;

    if (typeof exceptionResponse === 'string') {
      return {
        success: false,
        statusCode,
        timestamp: new Date().toISOString(),
        path,
        error: this.getDefaultError(statusCode),
        message: exceptionResponse,
      };
    }

    if (exceptionResponse && typeof exceptionResponse === 'object') {
      return {
        success: false,
        statusCode,
        timestamp: new Date().toISOString(),
        path,
        error: exceptionResponse.error ?? this.getDefaultError(statusCode),
        message:
          exceptionResponse.message ?? this.getDefaultMessage(statusCode),
      };
    }

    return {
      success: false,
      statusCode,
      timestamp: new Date().toISOString(),
      path,
      error: this.getDefaultError(statusCode),
      message: this.getDefaultMessage(statusCode),
    };
  }

  private getDefaultError(statusCode: number): string {
    switch (statusCode) {
      case HttpStatus.BAD_REQUEST:
        return 'Bad Request';
      case HttpStatus.UNAUTHORIZED:
        return 'Unauthorized';
      case HttpStatus.FORBIDDEN:
        return 'Forbidden';
      case HttpStatus.NOT_FOUND:
        return 'Not Found';
      case HttpStatus.CONFLICT:
        return 'Conflict';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'Unprocessable Entity';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'Too Many Requests';
      default:
        return 'Internal Server Error';
    }
  }

  private getDefaultMessage(statusCode: number): string {
    switch (statusCode) {
      case HttpStatus.BAD_REQUEST:
        return 'Bad request';
      case HttpStatus.UNAUTHORIZED:
        return 'Unauthorized';
      case HttpStatus.FORBIDDEN:
        return 'Forbidden resource';
      case HttpStatus.NOT_FOUND:
        return 'Resource not found';
      case HttpStatus.CONFLICT:
        return 'Conflict';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'Unprocessable entity';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'Too many requests';
      default:
        return 'Internal server error';
    }
  }
}
