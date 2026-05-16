//src\features\upload\upload.service.ts
import { ConfigService } from '@nestjs/config';
import { Injectable, BadRequestException } from '@nestjs/common';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service';
import {
  GetUploadSignatureDto,
  SignatureResponseDto,
} from './dto/get-upload-signature.dto';

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

  async getUploadSignature(
    dto: GetUploadSignatureDto,
  ): Promise<SignatureResponseDto> {
    // Map resourceType to the correct Cloudinary Upload Preset
    let uploadPreset: string;
    switch (dto.resourceType) {
      case 'image':
        uploadPreset = 'elearning_images';
        break;
      case 'video':
        uploadPreset = 'elearning_videos';
        break;
      case 'raw':
        uploadPreset = 'elearning_documents'; //PDF, DOCX, PPTX, etc.
        break;
      default:
        throw new BadRequestException('Invalid resourceType');
    }

    const paramsToSign: Record<string, any> = {
      folder: dto.folder,
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
      folder: dto.folder,
      resourceType: dto.resourceType,
    } as SignatureResponseDto;
  }
}
