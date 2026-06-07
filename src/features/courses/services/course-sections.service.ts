//src\features\courses\services\course-sections.service.ts
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { COURSE_SECTION_REPOSITORY } from '../repositories/course-section-repository.token';
import type {
  CourseSection,
  CreateCourseSectionInput,
  FindManyCourseSectionParams,
  ICourseSectionRepository,
  UpdateCourseSectionInput,
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
import { cleanData } from 'src/common/utils/clean-data-util';
import { CourseAccessService } from './course-access.service';

@Injectable()
export class CourseSectionsService {
  constructor(
    private readonly courseAccessService: CourseAccessService,

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
    await this.courseAccessService.ensureInstructorCanManageCourse(
      courseId,
      instructorId,
    );

    const sectionIndex =
      await this.iCourseSectionRepository.getNextSectionIndex(courseId);

    const section = await this.iCourseSectionRepository.create({
      courseId,
      title: dto.title,
      description: dto.description,
      sectionIndex,
    } satisfies CreateCourseSectionInput);

    const cleanedSection = cleanData(section);

    return plainToInstance(SectionResponseDto, cleanedSection, {
      excludeExtraneousValues: true,
      groups: [SECTION_VIEW_GROUPS.INSTRUCTOR],
    });
  }

  async updateSection(
    courseId: string,
    sectionId: string,
    instructorId: string,
    dto: UpdateSectionDto,
  ): Promise<SectionResponseDto> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('At least one field must be provided.');
    }
    await this.courseAccessService.ensureInstructorCanManageSection(
      courseId,
      instructorId,
      sectionId,
    );

    const existsInCourse = await this.iCourseSectionRepository.existsInCourse(
      sectionId,
      courseId,
    );

    if (!existsInCourse) {
      throw new NotFoundException('Section not found.');
    }

    const section = await this.iCourseSectionRepository.update(
      sectionId,
      cleanData({
        title: dto.title,
        description: dto.description,
        isActive: dto.isActive,
      } satisfies UpdateCourseSectionInput),
    );

    return plainToInstance(SectionResponseDto, section, {
      excludeExtraneousValues: true,
      groups: [SECTION_VIEW_GROUPS.INSTRUCTOR],
    });
  }

  async deleteSection(
    courseId: string,
    sectionId: string,
    instructorId: string,
  ): Promise<{ Message: string }> {
    await this.courseAccessService.ensureInstructorCanManageSection(
      courseId,
      instructorId,
      sectionId,
    );

    const section = await this.iCourseSectionRepository.findById(sectionId);

    if (!section || section.courseId !== courseId) {
      throw new NotFoundException('Section not found.');
    }

    const isSoftDeleted =
      await this.iCourseSectionRepository.softDeleteAndShiftSections(
        sectionId,
        courseId,
        section.sectionIndex,
      );

    return isSoftDeleted
      ? {
          Message: 'Delete successfully',
        }
      : { Message: 'Delete unsuccessfully' };
  }

  async reorderSections(
    courseId: string,
    instructorId: string,
    dto: ReorderSectionsDto,
  ): Promise<SectionResponseDto[]> {
    await this.courseAccessService.ensureInstructorCanManageCourse(
      courseId,
      instructorId,
    );

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

    const reorderedSections: CourseSection[] =
      await this.iCourseSectionRepository.reorderSections(
        courseId,
        dto.sectionIds,
      );

    return reorderedSections.map((reorderedSection) =>
      plainToInstance(SectionResponseDto, reorderedSection, {
        excludeExtraneousValues: true,
        groups: [SECTION_VIEW_GROUPS.INSTRUCTOR],
      }),
    );
  }

  async getSections(
    courseId: string,
    instructorId: string,
    query: QuerySectionsDto,
  ): Promise<PaginatedResponse<SectionResponseDto>> {
    await this.courseAccessService.ensureInstructorCanManageCourse(
      courseId,
      instructorId,
    );

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
