import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { MediaTypeEnum } from 'generated/prisma/enums';

export const FILE_MEDIA_VIEW_GROUPS = {
  OWNER: 'file-media:owner',
} as const;

export class FileMediaResponseDto {
  @ApiProperty({
    example: '7c0a2ad5-bdb7-4c1f-8f3e-4183a248d842',
  })
  @Expose({ groups: [FILE_MEDIA_VIEW_GROUPS.OWNER] })
  id!: string;

  @ApiProperty({
    example: '84e61d9c-f946-4635-a77e-7a81c12a5839',
  })
  @Expose({ groups: [FILE_MEDIA_VIEW_GROUPS.OWNER] })
  lessonId!: string;

  @ApiPropertyOptional({
    example: 'elearning/lessons/lesson-123/videos/intro',
    nullable: true,
  })
  @Expose({ groups: [FILE_MEDIA_VIEW_GROUPS.OWNER] })
  cloudinaryPublicId?: string | null;

  @ApiProperty({
    example:
      'https://res.cloudinary.com/demo/video/upload/v123/elearning/lessons/intro.mp4',
  })
  @Expose({ groups: [FILE_MEDIA_VIEW_GROUPS.OWNER] })
  url!: string;

  @ApiProperty({
    enum: MediaTypeEnum,
    example: MediaTypeEnum.VIDEO,
  })
  @Expose({ groups: [FILE_MEDIA_VIEW_GROUPS.OWNER] })
  type!: MediaTypeEnum;

  @ApiPropertyOptional({
    example: 'intro.mp4',
    nullable: true,
  })
  @Expose({ groups: [FILE_MEDIA_VIEW_GROUPS.OWNER] })
  filename?: string | null;

  @ApiPropertyOptional({
    example: 'video/mp4',
    nullable: true,
  })
  @Expose({ groups: [FILE_MEDIA_VIEW_GROUPS.OWNER] })
  mimeType?: string | null;

  @ApiPropertyOptional({
    example: 10485760,
    nullable: true,
  })
  @Expose({ groups: [FILE_MEDIA_VIEW_GROUPS.OWNER] })
  sizeInBytes?: number | null;

  @ApiProperty({
    example: '2026-06-10T07:15:35.261Z',
  })
  @Expose({ groups: [FILE_MEDIA_VIEW_GROUPS.OWNER] })
  createdAt!: Date;

  @ApiProperty({
    example: '2026-06-10T07:15:35.261Z',
  })
  @Expose({ groups: [FILE_MEDIA_VIEW_GROUPS.OWNER] })
  updatedAt!: Date;
}
