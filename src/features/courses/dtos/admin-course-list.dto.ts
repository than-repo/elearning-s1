// src/features/courses/dtos/admin-course-list.dto.ts
import { CourseLevel, CourseStatus } from 'generated/prisma/enums';

export class AdminCourseListDto {
  id!: string;
  title!: string;
  slug!: string;
  status!: CourseStatus;
  level!: CourseLevel;
  price?: number;
  isActive!: boolean;
  instructorName?: string;
  enrolledCount!: number;
  createdAt!: Date;
  updatedAt!: Date;
  deletedAt?: Date | null;
}
