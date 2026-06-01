//src\features\courses\dtos\course\paginated-course.dto.ts
import { PaginationMetaDto } from '../paginated-response.dto';
import { CourseResponseDto } from './course-response.dto';

export class PaginatedCourseResponseDto {
  data!: CourseResponseDto[];
  meta!: PaginationMetaDto;
}
