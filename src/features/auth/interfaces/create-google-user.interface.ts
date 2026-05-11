// src/features/auth/interfaces/create-google-user.interface.ts
export interface CreateGoogleUserData {
  email: string;
  fullName: string;
  googleId: string;
  accessToken: string;
  refreshToken?: string;
  avatarUrl?: string;
}
