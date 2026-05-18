// src/features/courses/dtos/course-list-item.dto.ts
import { CourseLevel } from 'generated/prisma/enums';

export class CourseListItemDto {
  id!: string;
  title!: string;
  slug!: string;
  shortDescription!: string;
  thumbnailUrl?: string;
  level!: CourseLevel;
  price?: number;
  instructorName?: string;
  averageRating?: number;
  createdAt!: Date;
}
