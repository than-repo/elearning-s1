//src\features\auth\interfaces\create-refresh-token.interface.ts
export interface CreateRefreshToken {
  userId: string;
  expiresAt: Date;
  deviceInfo?: string;
  ipAddress?: string;
}
