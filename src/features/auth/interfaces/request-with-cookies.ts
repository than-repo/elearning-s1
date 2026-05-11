// src/common/interfaces/request-with-cookies.ts
import { Request } from 'express';

export interface RequestWithCookies extends Request {
  cookies: {
    refreshToken?: string;
  };
}
