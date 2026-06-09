//src\features\courses\services\course-sections.service.ts
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { COURSE_SECTION_REPOSITORY } from '../repositories/course-section-repository.token';
import {
  InvalidCourseSectionDeleteError,
  InvalidCourseSectionOrderError,
} from '../interfaces/course-section.repository.interface';
import type {
  CourseSection,
  CreateAtEndCourseSectionInput,
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
import { ChangeSectionStatusDto } from '../dtos/section-lesson/change-section-status.dto';
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

    const input: CreateAtEndCourseSectionInput = {
      courseId,
      title: dto.title,
      description: dto.description,
    };

    const section = await this.iCourseSectionRepository.createAtEnd(input);
    if (!section) {
      throw new BadRequestException(
        'Could not create section order. Please try again.',
      );
    }
    return plainToInstance(SectionResponseDto, section, {
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

    const section = await this.iCourseSectionRepository.update(
      sectionId,
      cleanData({
        title: dto.title,
        description: dto.description,
      } satisfies UpdateCourseSectionInput),
    );

    return plainToInstance(SectionResponseDto, section, {
      excludeExtraneousValues: true,
      groups: [SECTION_VIEW_GROUPS.INSTRUCTOR],
    });
  }

  async changeSectionActiveStatus(
    courseId: string,
    sectionId: string,
    instructorId: string,
    dto: ChangeSectionStatusDto,
  ): Promise<SectionResponseDto> {
    await this.courseAccessService.ensureInstructorCanManageSection(
      courseId,
      instructorId,
      sectionId,
    );

    const section = await this.iCourseSectionRepository.changeActive(
      sectionId,
      courseId,
      dto.isActive,
    );

    if (!section) {
      throw new NotFoundException('Section not found.');
    }

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

    try {
      await this.iCourseSectionRepository.softDeleteAndShiftSections(
        sectionId,
        courseId,
        section.sectionIndex,
      );
    } catch (error) {
      if (error instanceof InvalidCourseSectionDeleteError) {
        throw new ConflictException(
          'Could not delete section order. Please try again.',
        );
      }

      throw error;
    }

    return {
      Message: 'Delete successfully',
    };
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

    try {
      const reorderedSections =
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
    } catch (error) {
      if (error instanceof InvalidCourseSectionOrderError) {
        throw new BadRequestException(
          'Invalid section order. Some sections do not belong to this course or were deleted.',
        );
      }

      throw error;
    }
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
