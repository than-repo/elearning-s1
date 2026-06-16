// src/common/interceptors/response-formatting.interceptor.ts

import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, map } from 'rxjs';

import { ApiResponse } from '../interfaces/api-response.interfaces';
import { SKIP_RESPONSE_FORMATTING_KEY } from '../decorators/skip-response-formatting.decorator';

function isApiResponse<T>(value: unknown): value is ApiResponse<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    typeof value.success === 'boolean'
  );
}

@Injectable()
export class ResponseFormattingInterceptor<
  T = unknown,
> implements NestInterceptor<T, ApiResponse<T> | T> {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T> | T> {
    const skipFormatting = this.reflector.getAllAndOverride<boolean>(
      SKIP_RESPONSE_FORMATTING_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipFormatting) {
      return next.handle();
    }

    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<{
      originalUrl?: string;
      url?: string;
    }>();
    const response = httpContext.getResponse<{
      statusCode?: number;
    }>();

    return next.handle().pipe(
      map((data: T): ApiResponse<T> => {
        if (isApiResponse<T>(data)) {
          return data;
        }

        return {
          success: true,
          statusCode: response.statusCode ?? HttpStatus.OK,
          timestamp: new Date().toISOString(),
          path: request.originalUrl ?? request.url ?? '',
          data: data ?? null,
        };
      }),
    );
  }
}
