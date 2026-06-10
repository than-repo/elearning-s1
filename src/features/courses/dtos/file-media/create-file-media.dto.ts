import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { MediaTypeEnum } from 'generated/prisma/enums';

export class CreateFileMediaDto {
  @ApiPropertyOptional({
    example: 'elearning/lessons/lesson-123/videos/intro',
    nullable: true,
  })
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;

    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : null;
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  cloudinaryPublicId?: string | null;

  @ApiProperty({
    example:
      'https://res.cloudinary.com/demo/video/upload/v123/elearning/lessons/intro.mp4',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsUrl({ require_tld: false })
  @IsNotEmpty()
  @MaxLength(2048)
  url!: string;

  @ApiProperty({
    enum: MediaTypeEnum,
    example: MediaTypeEnum.VIDEO,
  })
  @IsEnum(MediaTypeEnum)
  type!: MediaTypeEnum;

  @ApiPropertyOptional({
    example: 'intro.mp4',
    nullable: true,
  })
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;

    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : null;
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  filename?: string | null;

  @ApiPropertyOptional({
    example: 'video/mp4',
    nullable: true,
  })
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;

    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : null;
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  mimeType?: string | null;

  @ApiPropertyOptional({
    example: 10485760,
    minimum: 0,
    maximum: 2147483647,
    nullable: true,
  })
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;

    return Number(value);
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2147483647)
  sizeInBytes?: number | null;
}
