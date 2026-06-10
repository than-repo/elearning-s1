import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { MediaTypeEnum } from 'generated/prisma/enums';

export enum FileMediaSortFieldDto {
  FILENAME = 'filename',
  TYPE = 'type',
  SIZE_IN_BYTES = 'sizeInBytes',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export enum FileMediaSortDirectionDto {
  ASC = 'asc',
  DESC = 'desc',
}

export class QueryFileMediaDto {
  @ApiPropertyOptional({
    example: 'intro',
    description: 'Search file media by filename.',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({
    enum: MediaTypeEnum,
    example: MediaTypeEnum.VIDEO,
  })
  @IsOptional()
  @IsEnum(MediaTypeEnum)
  type?: MediaTypeEnum;

  @ApiPropertyOptional({
    example: 'video/mp4',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(100)
  mimeType?: string;

  @ApiPropertyOptional({
    enum: FileMediaSortFieldDto,
    example: FileMediaSortFieldDto.CREATED_AT,
    default: FileMediaSortFieldDto.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(FileMediaSortFieldDto)
  sortField?: FileMediaSortFieldDto = FileMediaSortFieldDto.CREATED_AT;

  @ApiPropertyOptional({
    enum: FileMediaSortDirectionDto,
    example: FileMediaSortDirectionDto.DESC,
    default: FileMediaSortDirectionDto.DESC,
  })
  @IsOptional()
  @IsEnum(FileMediaSortDirectionDto)
  sortDirection?: FileMediaSortDirectionDto = FileMediaSortDirectionDto.DESC;

  @ApiPropertyOptional({
    example: 1,
    default: 1,
    minimum: 1,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 10,
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}
