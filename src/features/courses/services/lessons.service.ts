//src\features\courses\services\course-sections.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { LESSON_REPOSITORY } from '../repositories/lesson-repository.token';
import type { ILessonRepository } from '../interfaces/lesson.repository.interface';

@Injectable()
export class LessonsService {
  constructor(
    @Inject(LESSON_REPOSITORY)
    private readonly ILessonRepository: ILessonRepository,
  ) {}
}
