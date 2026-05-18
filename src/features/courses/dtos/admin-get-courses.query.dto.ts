// courses/dtos/admin-get-courses-query.dto.ts
import { IsOptional, IsEnum, IsBoolean, IsString } from 'class-validator';
import { CourseLevel, CourseStatus } from 'generated/prisma/enums';
import { BaseGetCoursesQueryDto } from './base-get-courses.query.dto';

export class AdminGetCoursesQueryDto extends BaseGetCoursesQueryDto {
  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  instructorId?: string;
}
