import { CourseAccessService } from './course-access.service';
// src/features/courses/services/lessons.service.ts

import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

import {
  InvalidLessonOrderError,
  type CreateLessonAtEndInput,
  type ILessonRepository,
  type Lesson,
  type LessonOrderByInput,
  type LessonWhereInput,
  type UpdateLessonInput,
} from '../interfaces/lesson.repository.interface';

import { LESSON_REPOSITORY } from '../repositories/lesson-repository.token';
import { CreateLessonDto } from '../dtos/lesson/create-lesson.dto';
import {
  LESSON_VIEW_GROUPS,
  LessonResponseDto,
} from '../dtos/lesson/lesson-response.dto';
import { UpdateLessonDto } from '../dtos/lesson/update-lesson.dto';
import { QueryLessonsDto } from '../dtos/lesson/query-lessons.dto';
import { PaginatedResponse } from '../dtos/paginated-response.dto';
import { ReorderLessonsDto } from '../dtos/lesson/reorder-lesson.dto';

@Injectable()
export class LessonsService {
  constructor(
    @Inject(LESSON_REPOSITORY)
    private readonly lessonRepository: ILessonRepository,

    private readonly courseAccessService: CourseAccessService,
  ) {}

  private toOwnerLessonResponse(lesson: Lesson): LessonResponseDto {
    return plainToInstance(LessonResponseDto, lesson, {
      excludeExtraneousValues: true,
      groups: [LESSON_VIEW_GROUPS.OWNER],
    });
  }

  async createLesson(
    courseId: string,
    sectionId: string,
    instructorId: string,
    dto: CreateLessonDto,
  ): Promise<LessonResponseDto> {
    await this.courseAccessService.ensureInstructorCanManageSection(
      courseId,
      instructorId,
      sectionId,
    );

    const lesson = await this.lessonRepository.createAtEnd({
      sectionId,
      title: dto.title,
      description: dto.description ?? null,
    } satisfies CreateLessonAtEndInput);

    if (!lesson) {
      throw new ConflictException(
        'Could not create lesson order. Please try again.',
      );
    }
    return this.toOwnerLessonResponse(lesson);
  }

  async updateLesson(
    courseId: string,
    sectionId: string,
    lessonId: string,
    instructorId: string,
    dto: UpdateLessonDto,
  ): Promise<LessonResponseDto> {
    await this.courseAccessService.ensureInstructorCanManageLesson(
      courseId,
      instructorId,
      sectionId,
      lessonId,
    );

    const updateData = this.buildUpdateLessonInput(dto);

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No valid lesson fields provided.');
    }

    const updatedLesson = await this.lessonRepository.updateInSection(
      lessonId,
      sectionId,
      updateData,
    );

    if (!updatedLesson) {
      throw new NotFoundException('Lesson not found in this section.');
    }

    return this.toOwnerLessonResponse(updatedLesson);
  }

  private buildUpdateLessonInput(dto: UpdateLessonDto): UpdateLessonInput {
    const updateData: UpdateLessonInput = {};

    if (dto.title !== undefined) {
      updateData.title = dto.title;
    }

    if (dto.description !== undefined) {
      updateData.description = dto.description;
    }

    if (dto.isActive !== undefined) {
      updateData.isActive = dto.isActive;
    }

    return updateData;
  }

  async getLessons(
    courseId: string,
    sectionId: string,
    instructorId: string,
    query: QueryLessonsDto,
  ): Promise<PaginatedResponse<LessonResponseDto>> {
    await this.courseAccessService.ensureInstructorCanManageSection(
      courseId,
      instructorId,
      sectionId,
    );

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const offset = (page - 1) * limit;

    const where: LessonWhereInput = {
      sectionId,
      titleContains: query.search,
      isActive: query.isActive,
    };

    const orderBy: LessonOrderByInput = {
      field: query.sortField ?? 'lessonIndex',
      direction: query.sortDirection ?? 'asc',
    };

    const [lessons, total] = await Promise.all([
      this.lessonRepository.findMany({
        where,
        orderBy,
        limit,
        offset,
      }),
      this.lessonRepository.count({
        where,
      }),
    ]);

    const data = lessons.map((lesson) => this.toOwnerLessonResponse(lesson));

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }
  async deleteLesson(
    courseId: string,
    sectionId: string,
    lessonId: string,
    instructorId: string,
  ): Promise<void> {
    await this.courseAccessService.ensureInstructorCanManageLesson(
      courseId,
      instructorId,
      sectionId,
      lessonId,
    );

    const lesson = await this.lessonRepository.findById(lessonId);

    if (!lesson || lesson.sectionId !== sectionId) {
      throw new NotFoundException('Lesson not found in this section.');
    }

    await this.lessonRepository.softDeleteAndShift(
      lesson.id,
      sectionId,
      lesson.lessonIndex,
    );
  }

  async reorderLessons(
    courseId: string,
    sectionId: string,
    instructorId: string,
    dto: ReorderLessonsDto,
  ): Promise<LessonResponseDto[]> {
    await this.courseAccessService.ensureInstructorCanManageSection(
      courseId,
      instructorId,
      sectionId,
    );

    const existingLessons =
      await this.lessonRepository.findBySectionId(sectionId);

    if (existingLessons.length === 0) {
      throw new NotFoundException('No lessons found in this section.');
    }

    if (dto.lessonIds.length !== existingLessons.length) {
      throw new BadRequestException(
        'Lesson IDs must include all non-deleted lessons in this section.',
      );
    }

    const existingLessonIdSet = new Set(
      existingLessons.map((lesson) => lesson.id),
    );
    const requestedLessonIdSet = new Set(dto.lessonIds);

    if (requestedLessonIdSet.size !== dto.lessonIds.length) {
      throw new BadRequestException('Lesson IDs must be unique.');
    }

    const invalidLessonIds = dto.lessonIds.filter(
      (lessonId) => !existingLessonIdSet.has(lessonId),
    );

    if (invalidLessonIds.length > 0) {
      throw new BadRequestException(
        'Some lesson IDs do not belong to this section.',
      );
    }

    try {
      const reorderedLessons = await this.lessonRepository.reorderLessons(
        sectionId,
        dto.lessonIds,
      );

      return reorderedLessons.map((lesson) =>
        this.toOwnerLessonResponse(lesson),
      );
    } catch (error: unknown) {
      if (error instanceof InvalidLessonOrderError) {
        throw new BadRequestException(
          'Invalid lesson order. Some lessons do not belong to this section or were deleted.',
        );
      }
      throw error;
    }
  }
}
