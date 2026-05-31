import { Inject, Injectable } from '@nestjs/common';
import { COURSE_REPOSITORY } from '../repositories/course-repository.token';

@Injectable()
export class CoursesService {
  constructor(
    @Inject(COURSE_REPOSITORY)
    private readonly ICourseRepository,
  ) {}

  
}
