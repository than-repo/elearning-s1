import { IsUUID } from 'class-validator';

export class EnrollmentCourseParamDto {
  @IsUUID('4')
  courseId!: string;
}
