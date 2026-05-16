//src\common\cloudinary\cloudinary.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.getOrThrow('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.getOrThrow('CLOUDINARY_API_KEY'),
      api_secret: this.configService.getOrThrow('CLOUDINARY_API_SECRET'),
      secure: true,
    });
  }

  /**
   * Generate signature for secure signed upload
   */
  generateSignature(paramsToSign: Record<string, any>): string {
    const timestamp = Math.round(Date.now() / 1000);

    return cloudinary.utils.api_sign_request(
      { timestamp, ...paramsToSign },
      this.configService.getOrThrow('CLOUDINARY_API_SECRET'),
    );
  }

  /**
   * Verify Cloudinary webhook signature (security)
   */
  verifyWebhookSignature(
    body: any,
    timestamp: string | number, //  can receive string from header
    signature: string,
  ): boolean {
    try {
      // Convert timestamp to number (Cloudinary SDK requires number)
      const ts =
        typeof timestamp === 'string' ? parseInt(timestamp, 10) : timestamp;

      return cloudinary.utils.verifyNotificationSignature(
        JSON.stringify(body),
        ts, //  now guaranteed number
        signature,
        this.configService.getOrThrow('CLOUDINARY_API_SECRET'),
      );
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      return false;
    }
  }
}
