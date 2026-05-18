//src\features\upload\upload.service.ts
import { ConfigService } from '@nestjs/config';
import { Injectable, BadRequestException } from '@nestjs/common';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service';
import {
  GetUploadSignatureDto,
  SignatureResponseDto,
} from './dtos/get-upload-signature.dto';

@Injectable()
export class UploadService {
  constructor(
    private readonly cloudinaryService: CloudinaryService,
    private readonly configService: ConfigService,
  ) {}
  private get cloudName(): string {
    return this.configService.getOrThrow<string>('CLOUDINARY_CLOUD_NAME');
  }

  private get apiKey(): string {
    return this.configService.getOrThrow<string>('CLOUDINARY_API_KEY');
  }

  private readonly uploadPresets: Record<string, string> = {
    image: 'elearning_images',
    video: 'elearning_videos',
    raw: 'elearning_documents',
  };

  async getUploadSignature(
    dto: GetUploadSignatureDto,
  ): Promise<SignatureResponseDto> {
    const uploadPreset = this.uploadPresets[dto.resourceType];
    if (!uploadPreset) {
      throw new BadRequestException(
        `Invalid resourceType: ${dto.resourceType}`,
      );
    }

    // Build the folder safely
    let folder = `elearning/${dto.entityType}s/${dto.entityId}`;
    if (dto.subFolder) {
      folder = `${folder}/${dto.subFolder}`;
    }

    const paramsToSign: Record<string, any> = {
      folder,
      upload_preset: uploadPreset,
    };

    if (dto.publicId) {
      paramsToSign.public_id = dto.publicId;
    }

    const signature = this.cloudinaryService.generateSignature(paramsToSign);
    const timestamp = Math.round(Date.now() / 1000);

    return {
      signature,
      timestamp,
      cloudName: this.cloudName,
      apiKey: this.apiKey,
      uploadPreset,
      folder,
      resourceType: dto.resourceType,
    };
  }
}
