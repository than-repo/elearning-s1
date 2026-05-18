export class GetCoursesResponseDto<T = any> {
  data!: T[];
  meta!: {
    page: number;
    limit: number;
    total: number;
    totalPage: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
