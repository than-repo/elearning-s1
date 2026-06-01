// src/features/courses/dtos/course-response.dto.ts

import { Expose } from 'class-transformer';
import { CourseLevel, CourseStatus } from 'generated/prisma/enums';

export const COURSE_VIEW_GROUPS = {
  PUBLIC: 'course:public',
  STUDENT: 'course:student',
  INSTRUCTOR: 'course:instructor',
  ADMIN: 'course:admin',
} as const;

export type CourseViewGroup =
  (typeof COURSE_VIEW_GROUPS)[keyof typeof COURSE_VIEW_GROUPS];

export class CourseResponseDto {
  @Expose({
    groups: [
      COURSE_VIEW_GROUPS.PUBLIC,
      COURSE_VIEW_GROUPS.STUDENT,
      COURSE_VIEW_GROUPS.INSTRUCTOR,
      COURSE_VIEW_GROUPS.ADMIN,
    ],
  })
  id!: string;

  @Expose({
    groups: [
      COURSE_VIEW_GROUPS.PUBLIC,
      COURSE_VIEW_GROUPS.STUDENT,
      COURSE_VIEW_GROUPS.INSTRUCTOR,
      COURSE_VIEW_GROUPS.ADMIN,
    ],
  })
  title!: string;

  @Expose({
    groups: [
      COURSE_VIEW_GROUPS.PUBLIC,
      COURSE_VIEW_GROUPS.STUDENT,
      COURSE_VIEW_GROUPS.INSTRUCTOR,
      COURSE_VIEW_GROUPS.ADMIN,
    ],
  })
  slug!: string;

  @Expose({
    groups: [
      COURSE_VIEW_GROUPS.PUBLIC,
      COURSE_VIEW_GROUPS.STUDENT,
      COURSE_VIEW_GROUPS.INSTRUCTOR,
      COURSE_VIEW_GROUPS.ADMIN,
    ],
  })
  shortDescription!: string;

  @Expose({
    groups: [
      COURSE_VIEW_GROUPS.PUBLIC,
      COURSE_VIEW_GROUPS.STUDENT,
      COURSE_VIEW_GROUPS.INSTRUCTOR,
      COURSE_VIEW_GROUPS.ADMIN,
    ],
  })
  description?: string | null;

  @Expose({
    groups: [
      COURSE_VIEW_GROUPS.PUBLIC,
      COURSE_VIEW_GROUPS.STUDENT,
      COURSE_VIEW_GROUPS.INSTRUCTOR,
      COURSE_VIEW_GROUPS.ADMIN,
    ],
  })
  whatYouWillLearn?: string[] | null;

  @Expose({
    groups: [
      COURSE_VIEW_GROUPS.PUBLIC,
      COURSE_VIEW_GROUPS.STUDENT,
      COURSE_VIEW_GROUPS.INSTRUCTOR,
      COURSE_VIEW_GROUPS.ADMIN,
    ],
  })
  requirements?: string[] | null;

  @Expose({
    groups: [
      COURSE_VIEW_GROUPS.PUBLIC,
      COURSE_VIEW_GROUPS.STUDENT,
      COURSE_VIEW_GROUPS.INSTRUCTOR,
      COURSE_VIEW_GROUPS.ADMIN,
    ],
  })
  thumbnailUrl?: string | null;

  @Expose({
    groups: [
      COURSE_VIEW_GROUPS.PUBLIC,
      COURSE_VIEW_GROUPS.STUDENT,
      COURSE_VIEW_GROUPS.INSTRUCTOR,
      COURSE_VIEW_GROUPS.ADMIN,
    ],
  })
  level!: CourseLevel;

  @Expose({
    groups: [
      COURSE_VIEW_GROUPS.PUBLIC,
      COURSE_VIEW_GROUPS.STUDENT,
      COURSE_VIEW_GROUPS.INSTRUCTOR,
      COURSE_VIEW_GROUPS.ADMIN,
    ],
  })
  price?: number | null;

  @Expose({
    groups: [
      COURSE_VIEW_GROUPS.PUBLIC,
      COURSE_VIEW_GROUPS.STUDENT,
      COURSE_VIEW_GROUPS.INSTRUCTOR,
      COURSE_VIEW_GROUPS.ADMIN,
    ],
  })
  language?: string | null;

  @Expose({
    groups: [
      COURSE_VIEW_GROUPS.PUBLIC,
      COURSE_VIEW_GROUPS.STUDENT,
      COURSE_VIEW_GROUPS.INSTRUCTOR,
      COURSE_VIEW_GROUPS.ADMIN,
    ],
  })
  durationInMinutes?: number | null;

  @Expose({
    groups: [
      COURSE_VIEW_GROUPS.PUBLIC,
      COURSE_VIEW_GROUPS.STUDENT,
      COURSE_VIEW_GROUPS.INSTRUCTOR,
      COURSE_VIEW_GROUPS.ADMIN,
    ],
  })
  certificateEnabled!: boolean;

  @Expose({
    groups: [COURSE_VIEW_GROUPS.INSTRUCTOR, COURSE_VIEW_GROUPS.ADMIN],
  })
  status!: CourseStatus;

  @Expose({
    groups: [COURSE_VIEW_GROUPS.INSTRUCTOR, COURSE_VIEW_GROUPS.ADMIN],
  })
  isActive!: boolean;

  @Expose({
    groups: [COURSE_VIEW_GROUPS.INSTRUCTOR, COURSE_VIEW_GROUPS.ADMIN],
  })
  publishedAt?: Date | null;

  @Expose({
    groups: [COURSE_VIEW_GROUPS.ADMIN],
  })
  createdAt!: Date;

  @Expose({
    groups: [COURSE_VIEW_GROUPS.ADMIN],
  })
  updatedAt!: Date;

  @Expose({
    groups: [COURSE_VIEW_GROUPS.ADMIN],
  })
  deletedAt?: Date | null;
}
