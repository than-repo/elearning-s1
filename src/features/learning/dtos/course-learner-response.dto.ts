// src/modules/courses/dto/course-learning-response.dto.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { MediaTypeEnum } from 'generated/prisma/enums';

export class LearningFileDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  url!: string;

  @ApiProperty({ enum: MediaTypeEnum })
  @Expose()
  type!: MediaTypeEnum;
}

export class LearningLessonDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  title!: string;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  description?: string | null;

  @ApiProperty()
  @Expose()
  lessonIndex!: number;

  @ApiProperty({ type: [LearningFileDto] })
  @Expose()
  @Type(() => LearningFileDto)
  files!: LearningFileDto[];
}

export class LearningSectionDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  title!: string;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  description?: string | null;

  @ApiProperty()
  @Expose()
  sectionIndex!: number;

  @ApiProperty({ type: [LearningLessonDto] })
  @Expose()
  @Type(() => LearningLessonDto)
  lessons!: LearningLessonDto[];
}

export class CourseLearningResponseDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  title!: string;

  @ApiProperty()
  @Expose()
  slug!: string;

  @ApiProperty()
  @Expose()
  shortDescription!: string;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  thumbnailUrl?: string | null;

  @ApiProperty({ type: [LearningSectionDto] })
  @Expose()
  @Type(() => LearningSectionDto)
  sections!: LearningSectionDto[];
}
