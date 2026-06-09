export interface ApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  timestamp: string;
  path: string;
  data: T | null;
  message?: string;
}
