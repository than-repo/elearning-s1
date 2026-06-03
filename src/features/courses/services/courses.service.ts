import type { ICategoryRepository } from './../interfaces/category.repository.interface';
//src\features\courses\services\courses.service.ts
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { COURSE_REPOSITORY } from '../repositories/course-repository.token';
import type {
  CourseOrderByInput,
  CourseWhereInput,
  FindManyCourseParams,
  ICourseRepository,
} from '../interfaces/course.repository.interface';
import { LearnerCourseQueryDto } from '../dtos/course/course-query.dto';
import {
  COURSE_VIEW_GROUPS,
  CourseResponseDto,
} from '../dtos/course/course-response.dto';
import { cleanData } from 'src/common/utils/clean-data-util';
import { plainToInstance } from 'class-transformer';
import { PaginatedResponse } from '../dtos/paginated-response.dto';
import { CourseStatus } from 'generated/prisma/enums';
import { CreateCourseDto } from '../dtos/course/create-course.dto';
import { slugify } from 'src/common/utils/slugify.util';
import { CATEGORY_REPOSITORY } from '../repositories/category-repository.token';

@Injectable()
export class CoursesService {
  constructor(
    @Inject(COURSE_REPOSITORY)
    private readonly iCourseRepository: ICourseRepository,

    @Inject(CATEGORY_REPOSITORY)
    private readonly iCategoryRepository: ICategoryRepository,
  ) {}
  private async generateUniqueSlug(title: string): Promise<string> {
    const baseSlug = slugify(title);
    let slug = baseSlug;
    let count = 1;

    while (await this.iCourseRepository.existsBySlug(slug)) {
      slug = `${baseSlug}-${count++}`;
    }

    return slug;
  }

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
      this.iCourseRepository.findMany(param),
      this.iCourseRepository.count(cleanedWhere),
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
    const course = await this.iCourseRepository.findBySlug(slug);

    if (!course) {
      throw new NotFoundException('COURSE NOT FOUND');
    }

    return plainToInstance(CourseResponseDto, course, {
      excludeExtraneousValues: true,
      groups: [COURSE_VIEW_GROUPS.PUBLIC],
    });
  }

  async createDraftCourse(
    instructorId: string,
    dto: CreateCourseDto,
  ): Promise<CourseResponseDto> {
    const {
      categoryIds,
      title,
      shortDescription,
      description,
      whatYouWillLearn,
      requirements,
      level,
      price,
      language,
      certificateEnabled,
    } = dto;

    const categories =
      await this.iCategoryRepository.findManyByIds(categoryIds);

    if (categories.length !== categoryIds.length) {
      throw new NotFoundException('One or more categories not found');
    }

    const slug = await this.generateUniqueSlug(title);

    const course = await this.iCourseRepository.createDraftCourse({
      title,
      slug,
      shortDescription,
      description,
      whatYouWillLearn,
      requirements,
      level,
      price,
      language,
      certificateEnabled,
      status: CourseStatus.DRAFT,
      instructorId,
      categoryIds,
    });

    return plainToInstance(CourseResponseDto, course, {
      excludeExtraneousValues: true,
      groups: [COURSE_VIEW_GROUPS.INSTRUCTOR],
    });
  }
}
