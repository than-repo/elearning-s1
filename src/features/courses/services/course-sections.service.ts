//src\features\courses\services\course-sections.service.ts
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ILessonRepository } from '../interfaces/lesson.repository.interface';
import { COURSE_SECTION_REPOSITORY } from '../repositories/course-section-repository.token';
import type {
  FindManyCourseSectionParams,
  ICourseSectionRepository,
} from '../interfaces/course-section.repository.interface';
import type { ICourseRepository } from '../interfaces/course.repository.interface';
import { COURSE_REPOSITORY } from '../repositories/course-repository.token';
import { CreateSectionDto } from '../dtos/section-lesson/create-section.dti';
import {
  SECTION_VIEW_GROUPS,
  SectionResponseDto,
} from '../dtos/section-lesson/section-response.dto';
import { plainToInstance } from 'class-transformer';
import { UpdateSectionDto } from '../dtos/section-lesson/update-section.dto';
import { ReorderSectionsDto } from '../dtos/section-lesson/reorder-sections.dto';
import { QuerySectionsDto } from '../dtos/section-lesson/query-section.dto';
import { PaginatedResponse } from '../dtos/paginated-response.dto';

@Injectable()
export class CourseSectionsService {
  constructor(
    @Inject(COURSE_SECTION_REPOSITORY)
    private readonly iCourseSectionRepository: ICourseSectionRepository,

    @Inject(COURSE_REPOSITORY)
    private readonly iCourseRepository: ICourseRepository,
  ) {}
  private buildFindManySectionsParams(
    courseId: string,
    query: QuerySectionsDto,
  ): FindManyCourseSectionParams {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const offset = (page - 1) * limit;

    return {
      where: {
        courseId,
        titleContains: query.search,
        isActive: query.isActive,
        includeDeleted: query.includeDeleted,
      },
      orderBy: {
        field: query.sortField ?? 'sectionIndex',
        direction: query.sortDirection ?? 'asc',
      },
      limit,
      offset,
    };
  }
  async createSection(
    courseId: string,
    instructorId: string,
    dto: CreateSectionDto,
  ): Promise<SectionResponseDto> {
    await this.ensureInstructorCanManageCourse(courseId, instructorId);

    const sectionIndex =
      dto.sectionIndex ??
      (await this.iCourseSectionRepository.getNextSectionIndex(courseId));

    const section = await this.iCourseSectionRepository.create({
      courseId,
      title: dto.title,
      description: dto.description,
      sectionIndex,
    });

    return plainToInstance(SectionResponseDto, section, {
      excludeExtraneousValues: true,
      groups: [SECTION_VIEW_GROUPS.INSTRUCTOR],
    });
  }

  private async ensureInstructorCanManageCourse(
    courseId: string,
    instructorId: string,
  ): Promise<void> {
    const course = await this.iCourseRepository.findById(courseId);

    if (!course) {
      throw new NotFoundException('Course not found.');
    }

    const isOwner = await this.iCourseRepository.existsOwnedByInstructor(
      courseId,
      instructorId,
    );

    if (!isOwner) {
      throw new ForbiddenException(
        'You are not allowed to manage this course.',
      );
    }
  }

  async updateSection(
    courseId: string,
    sectionId: string,
    instructorId: string,
    dto: UpdateSectionDto,
  ): Promise<SectionResponseDto> {
    await this.ensureInstructorCanManageCourse(courseId, instructorId);

    const existsInCourse = await this.iCourseSectionRepository.existsInCourse(
      sectionId,
      courseId,
    );

    if (!existsInCourse) {
      throw new NotFoundException('Section not found.');
    }

    const section = await this.iCourseSectionRepository.update(sectionId, {
      title: dto.title,
      description: dto.description,
      isActive: dto.isActive,
    });

    return plainToInstance(SectionResponseDto, section, {
      excludeExtraneousValues: true,
      groups: [SECTION_VIEW_GROUPS.INSTRUCTOR],
    });
  }

  async deleteSection(
    courseId: string,
    sectionId: string,
    instructorId: string,
  ): Promise<void> {
    await this.ensureInstructorCanManageCourse(courseId, instructorId);

    const section = await this.iCourseSectionRepository.findById(sectionId);

    if (!section || section.courseId !== courseId) {
      throw new NotFoundException('Section not found.');
    }

    await this.iCourseSectionRepository.softDelete(sectionId);

    await this.iCourseSectionRepository.shiftSectionsAfterDelete(
      courseId,
      section.sectionIndex,
    );
  }

  async reorderSections(
    courseId: string,
    instructorId: string,
    dto: ReorderSectionsDto,
  ): Promise<SectionResponseDto[]> {
    await this.ensureInstructorCanManageCourse(courseId, instructorId);

    const sections =
      await this.iCourseSectionRepository.findByCourseId(courseId);

    const existingSectionIds = new Set(sections.map((section) => section.id));

    const hasInvalidSectionId = dto.sectionIds.some(
      (sectionId) => !existingSectionIds.has(sectionId),
    );

    if (hasInvalidSectionId || dto.sectionIds.length !== sections.length) {
      throw new BadRequestException(
        'Invalid section order. All active sections of the course must be included.',
      );
    }

    const reorderedSections =
      await this.iCourseSectionRepository.reorderSections(
        courseId,
        dto.sectionIds,
      );

    return plainToInstance(SectionResponseDto, reorderedSections, {
      excludeExtraneousValues: true,
      groups: [SECTION_VIEW_GROUPS.INSTRUCTOR],
    });
  }

  async getSections(
    courseId: string,
    instructorId: string,
    query: QuerySectionsDto,
  ): Promise<PaginatedResponse<SectionResponseDto>> {
    await this.ensureInstructorCanManageCourse(courseId, instructorId);

    const params = this.buildFindManySectionsParams(courseId, query);

    const [sections, total] = await Promise.all([
      this.iCourseSectionRepository.findMany(params),
      this.iCourseSectionRepository.count({
        where: params.where,
      }),
    ]);

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const totalPages = Math.ceil(total / limit);

    return {
      data: plainToInstance(SectionResponseDto, sections, {
        excludeExtraneousValues: true,
        groups: [SECTION_VIEW_GROUPS.INSTRUCTOR],
      }),
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
}
