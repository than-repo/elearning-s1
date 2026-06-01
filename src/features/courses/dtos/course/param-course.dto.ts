//src\features\courses\dtos\course\param-course.dto.ts
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class CourseSlugParamDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[a-z0-9-]+$/)
  slug!: string;
}
