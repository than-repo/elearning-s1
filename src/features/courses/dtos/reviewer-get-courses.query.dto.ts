// courses/dtos/reviewer-get-courses-query.dto.ts
import { IsOptional, IsEnum } from 'class-validator';
import { CourseStatus } from 'generated/prisma/enums';
import { BaseGetCoursesQueryDto } from './base-get-courses.query.dto';

export class ReviewerGetCoursesQueryDto extends BaseGetCoursesQueryDto {
  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;
}
