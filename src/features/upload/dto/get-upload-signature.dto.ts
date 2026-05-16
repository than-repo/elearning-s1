import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

export class GetUploadSignatureDto {
  @IsString()
  @IsNotEmpty({ message: 'Folder  are required' })
  folder!: string; //  courses/123/lectures/456/images

  @IsEnum(['image', 'video', 'raw'])
  @IsNotEmpty({ message: 'ResourceType  are required' })
  resourceType!: 'image' | 'video' | 'raw';

  @IsString()
  @IsOptional()
  publicId?: string; // optional custom public_id
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
