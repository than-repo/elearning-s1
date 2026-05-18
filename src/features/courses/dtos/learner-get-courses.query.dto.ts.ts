// courses/dtos/learner-get-courses-query.dto.ts
import { IsOptional, IsEnum, IsString } from 'class-validator';
import { CourseLevel } from 'generated/prisma/enums';
import { BaseGetCoursesQueryDto } from './base-get-courses.query.dto';

export class LearnerGetCoursesQueryDto extends BaseGetCoursesQueryDto {
  @IsOptional()
  @IsString()
  instructorId?: string;
}
