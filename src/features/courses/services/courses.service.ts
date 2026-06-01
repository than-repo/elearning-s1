//src\features\courses\services\courses.service.ts
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { COURSE_REPOSITORY } from '../repositories/course-repository.token';
import type {
  CourseModel,
  CourseOrderByInput,
  CourseWhereInput,
  CreateCourseInput,
  FindManyCourseParams,
  ICourseRepository,
} from '../interfaces/course.repository.interface';
import {
  BaseCourseQueryDto,
  LearnerCourseQueryDto,
} from '../dtos/course/course-query.dto';
import {
  COURSE_VIEW_GROUPS,
  CourseResponseDto,
} from '../dtos/course/course-response.dto';
import { cleanData } from 'src/common/utils/clean-data-util';
import { plainToInstance } from 'class-transformer';
import { PaginatedResponse } from '../dtos/paginated-response.dto';
import { CourseStatus } from 'generated/prisma/enums';
import { NOTFOUND } from 'dns';

@Injectable()
export class CoursesService {
  constructor(
    @Inject(COURSE_REPOSITORY)
    private readonly ICourseRepository: ICourseRepository,
  ) {}

  async findAllPublic(
    dto: LearnerCourseQueryDto,
  ): Promise<PaginatedResponse<CourseResponseDto>> {
    const where: CourseWhereInput = {
      search: dto.search,
      level: dto.level,
      status: CourseStatus.PUBLISHED,
      isActive: true,
      certificateEnabled: dto.certificateEnabled,
      categoryId: dto.categoryId,
      instructorId: dto.instructorId,
      minPrice: dto.minPrice,
      maxPrice: dto.maxPrice,
      language: dto.language,
      publishedFrom: dto.publishedFrom
        ? new Date(dto.publishedFrom)
        : undefined,
      publishedTo: dto.publishedTo ? new Date(dto.publishedTo) : undefined,
    };
    const cleanedWhere = cleanData(where);

    const orderBy: CourseOrderByInput = {
      field: dto.sortField ?? 'createdAt',
      direction: dto.sortDirection ?? 'asc',
    };

    const page = dto.page ?? 1;
    const limit: number = dto.limit ?? 10;
    const offset: number = (page - 1) * limit;

    const param: FindManyCourseParams = {
      where: cleanedWhere,
      orderBy,
      limit,
      offset,
    };

    const [courses, total] = await Promise.all([
      this.ICourseRepository.findMany(param),
      this.ICourseRepository.count(cleanedWhere),
    ]);

    const totalPages: number = Math.ceil(total / limit);
    return {
      data: courses.map((course) =>
        plainToInstance(CourseResponseDto, course, {
          excludeExtraneousValues: true,
          groups: [COURSE_VIEW_GROUPS.PUBLIC],
        }),
      ),
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

  async findCourseBySlug(slug: string): Promise<CourseResponseDto> {
    const course = await this.ICourseRepository.findBySlug(slug);

    if (!course) {
      throw new NotFoundException('COURSE NOT FOUND');
    }

    return plainToInstance(CourseResponseDto, course, {
      excludeExtraneousValues: true,
      groups: [COURSE_VIEW_GROUPS.PUBLIC],
    });
  }
}
