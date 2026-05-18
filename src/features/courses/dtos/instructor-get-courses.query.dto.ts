// courses/dtos/instructor-get-courses-query.dto.ts
import { IsOptional, IsEnum } from 'class-validator';
import { CourseLevel, CourseStatus } from 'generated/prisma/enums';
import { BaseGetCoursesQueryDto } from './base-get-courses.query.dto';

export class InstructorGetCoursesQueryDto extends BaseGetCoursesQueryDto {
  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus; // Allow seeing DRAFT, PUBLISHED, ARCHIEVED
}
