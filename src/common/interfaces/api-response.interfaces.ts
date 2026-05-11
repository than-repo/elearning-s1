export interface ApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  timestamp: String;
  path: String;
  data: T | null;
  message?: String;
}
