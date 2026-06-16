// src/common/interfaces/api-error-response.interface.ts

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  timestamp: string;
  path: string;
  error: string;
  message: string | string[];
}
