// src/common/interceptors/response-formatting.interceptor.ts

import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

import { ApiResponse } from '../interfaces/api-response.interfaces';

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
> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
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
