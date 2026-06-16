export interface CreatePasswordResetTokenInput {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface ResetPasswordInput {
  tokenHash: string;
  passwordHash: string;
}
