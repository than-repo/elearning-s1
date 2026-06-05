// src/features/courses/dtos/section-lesson/section-response.dto.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export const SECTION_VIEW_GROUPS = {
  LEARNER: 'section:learner',
  INSTRUCTOR: 'section:instructor',
  ADMIN: 'section:admin',
} as const;

export type SectionViewGroup =
  (typeof SECTION_VIEW_GROUPS)[keyof typeof SECTION_VIEW_GROUPS];

const ALL_SECTION_GROUPS = [
  SECTION_VIEW_GROUPS.LEARNER,
  SECTION_VIEW_GROUPS.INSTRUCTOR,
  SECTION_VIEW_GROUPS.ADMIN,
];

const MANAGEMENT_SECTION_GROUPS = [
  SECTION_VIEW_GROUPS.INSTRUCTOR,
  SECTION_VIEW_GROUPS.ADMIN,
];

export class SectionLessonSummaryDto {
  @ApiProperty({
    description: 'Unique identifier of the lesson.',
    example: '8f6a9b2e-3c7d-4b91-9c45-72a7d1a6b9e3',
  })
  @Expose({ groups: ALL_SECTION_GROUPS })
  id!: string;

  @ApiProperty({
    description: 'Title of the lesson.',
    example: 'What is React?',
  })
  @Expose({ groups: ALL_SECTION_GROUPS })
  title!: string;

  @ApiPropertyOptional({
    description: 'Optional description of the lesson.',
    example: 'This lesson explains the basic idea of React components.',
    nullable: true,
  })
  @Expose({ groups: ALL_SECTION_GROUPS })
  description?: string | null;

  @ApiProperty({
    description: 'Order index of the lesson inside the section.',
    example: 0,
  })
  @Expose({ groups: ALL_SECTION_GROUPS })
  lessonIndex!: number;

  @ApiProperty({
    description: 'Whether the lesson is currently active.',
    example: true,
  })
  @Expose({ groups: MANAGEMENT_SECTION_GROUPS })
  isActive!: boolean;

  @ApiProperty({
    description: 'Date and time when the lesson was created.',
    example: '2026-06-05T10:30:00.000Z',
  })
  @Expose({ groups: MANAGEMENT_SECTION_GROUPS })
  createdAt!: Date;

  @ApiProperty({
    description: 'Date and time when the lesson was last updated.',
    example: '2026-06-05T10:30:00.000Z',
  })
  @Expose({ groups: MANAGEMENT_SECTION_GROUPS })
  updatedAt!: Date;

  @ApiPropertyOptional({
    description: 'Date and time when the lesson was soft deleted.',
    example: null,
    nullable: true,
  })
  @Expose({ groups: MANAGEMENT_SECTION_GROUPS })
  deletedAt?: Date | null;
}

export class SectionResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the course section.',
    example: '4d2b8f91-6f5a-4e3a-91b7-8f9c4a2d5e10',
  })
  @Expose({ groups: ALL_SECTION_GROUPS })
  id!: string;

  @ApiProperty({
    description: 'ID of the course that owns this section.',
    example: 'b91c9f2e-87a2-4d72-9f4a-7f93e8b6c123',
  })
  @Expose({ groups: MANAGEMENT_SECTION_GROUPS })
  courseId!: string;

  @ApiProperty({
    description: 'Title of the course section.',
    example: 'Introduction to React Fundamentals',
  })
  @Expose({ groups: ALL_SECTION_GROUPS })
  title!: string;

  @ApiPropertyOptional({
    description: 'Optional description of the section.',
    example:
      'This section introduces the basic concepts, setup, and workflow before building React components.',
    nullable: true,
  })
  @Expose({ groups: ALL_SECTION_GROUPS })
  description?: string | null;

  @ApiProperty({
    description: 'Order index of the section inside the course.',
    example: 0,
  })
  @Expose({ groups: ALL_SECTION_GROUPS })
  sectionIndex!: number;

  @ApiProperty({
    description: 'Whether the section is currently active.',
    example: true,
  })
  @Expose({ groups: MANAGEMENT_SECTION_GROUPS })
  isActive!: boolean;

  @ApiProperty({
    description: 'Date and time when the section was created.',
    example: '2026-06-05T10:30:00.000Z',
  })
  @Expose({ groups: MANAGEMENT_SECTION_GROUPS })
  createdAt!: Date;

  @ApiProperty({
    description: 'Date and time when the section was last updated.',
    example: '2026-06-05T10:30:00.000Z',
  })
  @Expose({ groups: MANAGEMENT_SECTION_GROUPS })
  updatedAt!: Date;

  @ApiPropertyOptional({
    description: 'Date and time when the section was soft deleted.',
    example: null,
    nullable: true,
  })
  @Expose({ groups: MANAGEMENT_SECTION_GROUPS })
  deletedAt?: Date | null;

  @ApiPropertyOptional({
    description:
      'Lessons under this section. Usually included only in detail or list-with-lessons responses.',
    type: [SectionLessonSummaryDto],
  })
  @Expose({ groups: ALL_SECTION_GROUPS })
  @Type(() => SectionLessonSummaryDto)
  lessons?: SectionLessonSummaryDto[];
}
