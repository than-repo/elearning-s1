// src/features/courses/dtos/course-response.dto.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { CourseLevel, CourseStatus } from 'generated/prisma/enums';

export const COURSE_VIEW_GROUPS = {
  PUBLIC: 'course:public',
  STUDENT: 'course:student',
  INSTRUCTOR: 'course:instructor',
  REVIEWER: 'course:reviewer',
  ADMIN: 'course:admin',
} as const;

export type CourseViewGroup =
  (typeof COURSE_VIEW_GROUPS)[keyof typeof COURSE_VIEW_GROUPS];

const ALL_COURSE_GROUPS = [
  COURSE_VIEW_GROUPS.PUBLIC,
  COURSE_VIEW_GROUPS.STUDENT,
  COURSE_VIEW_GROUPS.INSTRUCTOR,
  COURSE_VIEW_GROUPS.REVIEWER,
  COURSE_VIEW_GROUPS.ADMIN,
];

const MANAGEMENT_COURSE_GROUPS = [
  COURSE_VIEW_GROUPS.INSTRUCTOR,
  COURSE_VIEW_GROUPS.REVIEWER,
  COURSE_VIEW_GROUPS.ADMIN,
];

export class CourseResponseDto {
  @ApiProperty()
  @Expose({ groups: ALL_COURSE_GROUPS })
  id!: string;

  @ApiProperty()
  @Expose({ groups: ALL_COURSE_GROUPS })
  title!: string;

  @ApiProperty()
  @Expose({ groups: ALL_COURSE_GROUPS })
  slug!: string;

  @ApiProperty()
  @Expose({ groups: ALL_COURSE_GROUPS })
  shortDescription!: string;

  @ApiPropertyOptional({ nullable: true })
  @Expose({ groups: ALL_COURSE_GROUPS })
  description?: string | null;

  @ApiPropertyOptional({ type: [String], nullable: true })
  @Expose({ groups: ALL_COURSE_GROUPS })
  whatYouWillLearn?: string[] | null;

  @ApiPropertyOptional({ type: [String], nullable: true })
  @Expose({ groups: ALL_COURSE_GROUPS })
  requirements?: string[] | null;

  @ApiPropertyOptional({ nullable: true })
  @Expose({ groups: ALL_COURSE_GROUPS })
  thumbnailUrl?: string | null;

  @ApiProperty({ enum: CourseLevel })
  @Expose({ groups: ALL_COURSE_GROUPS })
  level!: CourseLevel;

  @ApiPropertyOptional({ nullable: true })
  @Expose({ groups: ALL_COURSE_GROUPS })
  price?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @Expose({ groups: ALL_COURSE_GROUPS })
  language?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Expose({ groups: ALL_COURSE_GROUPS })
  durationInMinutes?: number | null;

  @ApiProperty()
  @Expose({ groups: ALL_COURSE_GROUPS })
  certificateEnabled!: boolean;

  @ApiPropertyOptional({
    type: () => [CourseCategoryResponseDto],
  })
  @Expose({ groups: ALL_COURSE_GROUPS })
  categories?: CourseCategoryResponseDto[];

  @ApiPropertyOptional({
    type: () => [CourseInstructorResponseDto],
  })
  @Expose({ groups: ALL_COURSE_GROUPS })
  instructors?: CourseInstructorResponseDto[];

  @ApiProperty({ enum: CourseStatus })
  @Expose({ groups: MANAGEMENT_COURSE_GROUPS })
  status!: CourseStatus;

  @ApiProperty()
  @Expose({ groups: MANAGEMENT_COURSE_GROUPS })
  isActive!: boolean;

  @ApiPropertyOptional({ nullable: true })
  @Expose({ groups: MANAGEMENT_COURSE_GROUPS })
  publishedAt?: Date | null;

  @ApiProperty()
  @Expose({ groups: MANAGEMENT_COURSE_GROUPS })
  createdAt!: Date;

  @ApiProperty()
  @Expose({ groups: MANAGEMENT_COURSE_GROUPS })
  updatedAt!: Date;

  @ApiPropertyOptional({ nullable: true })
  @Expose({ groups: [COURSE_VIEW_GROUPS.ADMIN] })
  deletedAt?: Date | null;
}

export class CourseCategoryResponseDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  name!: string;

  @ApiProperty()
  @Expose()
  slug!: string;
}

export class CourseInstructorResponseDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  fullName!: string;
}
