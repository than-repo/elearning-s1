// src/features/upload/dto/get-upload-signature.dto.ts
import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

export class GetUploadSignatureDto {
  @IsEnum(['course', 'lecture', 'lesson', 'post', 'user', 'document']) // add your entities
  @IsNotEmpty()
  entityType!: 'course' | 'lecture' | 'lesson' | 'post' | 'user' | 'document';

  @IsString()
  @IsNotEmpty()
  entityId!: string;

  @IsEnum(['image', 'video', 'raw'])
  @IsNotEmpty()
  resourceType!: 'image' | 'video' | 'raw';

  @IsString()
  @IsOptional()
  subFolder?: string; // optional: 'thumbnail', 'content', 'avatar', 'attachments', etc.

  @IsString()
  @IsOptional()
  publicId?: string; // still optional for custom filename
}
export class SignatureResponseDto {
  signature!: string;
  timestamp!: number | string;
  cloudName!: string;
  apiKey!: string;
  uploadPreset!: string;
  folder!: string;
  resourceType!: 'image' | 'video' | 'raw';
}
