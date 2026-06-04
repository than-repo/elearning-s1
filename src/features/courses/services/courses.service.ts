import type { ICategoryRepository } from './../interfaces/category.repository.interface';
//src\features\courses\services\courses.service.ts
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { COURSE_REPOSITORY } from '../repositories/course-repository.token';
import type {
  CourseOrderByInput,
  CourseWhereInput,
  FindManyCourseParams,
  ICourseRepository,
  UpdateCourseInput,
} from '../interfaces/course.repository.interface';
import {
  InstructorCourseQueryDto,
  LearnerCourseQueryDto,
} from '../dtos/course/query-course.dto';
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
import { UpdateCourseDto } from '../dtos/course/update-course.dto';

@Injectable()
export class CoursesService {
  constructor(
    @Inject(COURSE_REPOSITORY)
    private readonly iCourseRepository: ICourseRepository,

    @Inject(CATEGORY_REPOSITORY)
    private readonly iCategoryRepository: ICategoryRepository,
  ) {}
  private async generateUniqueSlug(
    title: string,
    courseId?: string,
  ): Promise<string> {
    const baseSlug = slugify(title);
    let slug = baseSlug;
    let count = 1;

    while (await this.iCourseRepository.existsBySlug(slug, courseId)) {
      slug = `${baseSlug}-${count++}`;
    }

    return slug;
  }
  private async areValidCategories(iDs: string[]): Promise<Boolean> {
    const categories = await this.iCategoryRepository.findManyByIds(iDs);

    return categories.length === iDs.length;
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
      direction: dto.sortDirection ?? 'desc',
    };

    const page = Math.max(dto.page ?? 1, 1);
    const limit = Math.min(Math.max(dto.limit ?? 10, 1), 50);
    const offset = (page - 1) * limit;

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

    if (!this.areValidCategories(categoryIds)) {
      throw new NotFoundException('CATEGORY ID NOT FOUND');
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

  async updateDraftCourse(
    instructorId: string,
    courseId: string,
    dto: UpdateCourseDto,
  ): Promise<CourseResponseDto> {
    const course = await this.iCourseRepository.findById(courseId);

    if (!course) {
      throw new NotFoundException('COURSE_NOT_FOUND');
    }

    const isOwner = await this.iCourseRepository.existsOwnedByInstructor(
      courseId,
      instructorId,
    );

    if (!isOwner) {
      throw new ForbiddenException('ACCESS_DENIED');
    }

    if (course.status !== CourseStatus.DRAFT) {
      throw new BadRequestException('ONLY_DRAFT_COURSE_CAN_BE_UPDATED');
    }

    if (dto.categoryIds?.length) {
      const validCategories = await this.areValidCategories(dto.categoryIds);

      if (!validCategories) {
        throw new NotFoundException('CATEGORIES NOT FOUND');
      }
    }

    const input: UpdateCourseInput = {
      title: dto.title,
      shortDescription: dto.shortDescription,
      description: dto.description,
      whatYouWillLearn: dto.whatYouWillLearn,
      requirements: dto.requirements,
      level: dto.level,
      price: dto.price,
      language: dto.language,

      certificateEnabled: dto.certificateEnabled,
      categoryIds: dto.categoryIds,
    };

    if (dto.title && dto.title !== course.title) {
      input.slug = await this.generateUniqueSlug(dto.title, course.id);
    }

    const updatedCourse = await this.iCourseRepository.updateDraftCourse(
      courseId,
      cleanData(input),
    );

    return plainToInstance(CourseResponseDto, updatedCourse, {
      excludeExtraneousValues: true,
      groups: [COURSE_VIEW_GROUPS.INSTRUCTOR],
    });
  }

  async findInstructorCourses(
    instructorId: string,
    dto: InstructorCourseQueryDto,
  ): Promise<PaginatedResponse<CourseResponseDto>> {
    const page = Math.max(dto.page ?? 1, 1);
    const limit = Math.min(Math.max(dto.limit ?? 10, 1), 50);
    const offset = (page - 1) * limit;

    const where: CourseWhereInput = cleanData({
      search: dto.search,
      level: dto.level,
      status: dto.status,
      isActive: dto.isActive,
      certificateEnabled: dto.certificateEnabled,
      categoryId: dto.categoryId,
      instructorId,
      minPrice: dto.minPrice,
      maxPrice: dto.maxPrice,
      language: dto.language,
      publishedFrom: dto.publishedFrom
        ? new Date(dto.publishedFrom)
        : undefined,
      publishedTo: dto.publishedTo ? new Date(dto.publishedTo) : undefined,
    });

    const orderBy: CourseOrderByInput = {
      field: dto.sortField ?? 'createdAt',
      direction: dto.sortDirection ?? 'desc',
    };

    const [courses, total] = await Promise.all([
      this.iCourseRepository.findMany({
        where,
        orderBy,
        limit,
        offset,
      }),
      this.iCourseRepository.count(where),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: plainToInstance(CourseResponseDto, courses, {
        excludeExtraneousValues: true,
        groups: [COURSE_VIEW_GROUPS.INSTRUCTOR],
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
