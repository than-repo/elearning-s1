// src/features/courses/dtos/lesson-response.dto.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export const LESSON_VIEW_GROUPS = {
  LEARNER: 'lesson:learner',
  REVIEWER: 'lesson:reviewer',
  OWNER: 'lesson:owner',
} as const;

export type LessonViewGroup =
  (typeof LESSON_VIEW_GROUPS)[keyof typeof LESSON_VIEW_GROUPS];

const ALL_LESSON_GROUPS = [
  LESSON_VIEW_GROUPS.LEARNER,
  LESSON_VIEW_GROUPS.REVIEWER,
  LESSON_VIEW_GROUPS.OWNER,
];

const MANAGEMENT_LESSON_GROUPS = [
  LESSON_VIEW_GROUPS.REVIEWER,
  LESSON_VIEW_GROUPS.OWNER,
];

export class LessonResponseDto {
  @ApiProperty({
    example: '7c0a2ad5-bdb7-4c1f-8f3e-4183a248d842',
  })
  @Expose({ groups: ALL_LESSON_GROUPS })
  id!: string;

  @ApiProperty({
    example: 'Introduction to HTML',
  })
  @Expose({ groups: ALL_LESSON_GROUPS })
  title!: string;

  @ApiPropertyOptional({
    example: 'This lesson introduces the basic structure of an HTML document.',
    nullable: true,
  })
  @Expose({ groups: ALL_LESSON_GROUPS })
  description?: string | null;

  @ApiProperty({
    example: 0,
    description: 'Zero-based lesson order inside a section.',
  })
  @Expose({ groups: ALL_LESSON_GROUPS })
  lessonIndex!: number;

  /**
   * Management / review fields
   * Learners do not need to know internal section id.
   */
  @ApiProperty({
    example: '84e61d9c-f946-4635-a77e-7a81c12a5839',
  })
  @Expose({ groups: MANAGEMENT_LESSON_GROUPS })
  sectionId!: string;

  @ApiProperty({
    example: true,
  })
  @Expose({ groups: MANAGEMENT_LESSON_GROUPS })
  isActive!: boolean;

  /**
   * Owner-only sensitive/internal fields
   */
  @ApiProperty({
    example: '2026-06-05T07:15:35.261Z',
  })
  @Expose({ groups: [LESSON_VIEW_GROUPS.OWNER] })
  createdAt!: Date;

  @ApiProperty({
    example: '2026-06-05T07:15:35.261Z',
  })
  @Expose({ groups: [LESSON_VIEW_GROUPS.OWNER] })
  updatedAt!: Date;

  @ApiPropertyOptional({
    example: null,
    nullable: true,
  })
  @Expose({ groups: [LESSON_VIEW_GROUPS.OWNER] })
  deletedAt!: Date | null;
}
