// src/features/courses/dtos/instructor-course-list.dto.ts
import { CourseLevel, CourseStatus } from 'generated/prisma/enums';

export class InstructorCourseListDto {
  id!: string;
  title!: string;
  slug!: string;
  status!: CourseStatus;
  level!: CourseLevel;
  price?: number;
  thumbnailUrl?: string;
  enrolledCount!: number;
  sectionCount!: number;
  lessonCount!: number;
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}
