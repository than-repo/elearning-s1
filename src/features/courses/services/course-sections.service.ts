//src\features\courses\services\course-sections.service.ts
import { Inject, Injectable } from '@nestjs/common';
import type { ILessonRepository } from '../interfaces/lesson.repository.interface';
import { COURSE_SECTION_REPOSITORY } from '../repositories/course-section-repository.token';

@Injectable()
export class CourseSectionsService {
  constructor(
    @Inject(COURSE_SECTION_REPOSITORY)
    private readonly iLessonRepository: ILessonRepository,
  ) {}
}
