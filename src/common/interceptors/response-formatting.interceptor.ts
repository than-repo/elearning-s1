//src\common\interceptors\response-formatting.interceptor.ts
import { map, Observable } from 'rxjs';
import { ApiResponse } from './../interfaces/api-response.interfaces';
import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';

@Injectable()
export class ResponseFormattingInterceptor<T = any> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest();
    const response = httpContext.getResponse();

    return next
      .handle() // tells: Nest run controller and
      .pipe(
        // receive draf data
        map((data: any) => {
          if (
            data &&
            typeof data === 'object' &&
            'success' in data &&
            data.success !== undefined
          ) {
            return data;
          }

          return {
            success: true,
            statusCode: response.statusCode || HttpStatus.OK,
            timestamp: new Date().toISOString(),
            path: request.originalUrl || request.url,
            data: data ?? null,
          } satisfies ApiResponse<T>;
        }),
      );
  }
}
