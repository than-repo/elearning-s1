import type { ICategoryRepository } from './../interfaces/category.repository.interface';
//src\features\courses\services\courses.service.ts
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { COURSE_REPOSITORY } from '../repositories/course-repository.token';
import type {
  CourseModel,
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
import { Prisma } from 'generated/prisma/client';
import { CreateCourseDto } from '../dtos/course/create-course.dto';
import { slugify } from 'src/common/utils/slugify.util';
import { CATEGORY_REPOSITORY } from '../repositories/category-repository.token';
import { UpdateCourseDto } from '../dtos/course/update-course.dto';
import { CourseAccessService } from './course-access.service';
import { COURSE_REVIEW_REPOSITORY } from '../repositories/course-review-repository.token';
import type { ICourseReviewRepository } from '../interfaces/course-review.repository.interface';
import { InstructorCourseLatestReviewResponseDto } from '../dtos/course/instructor-course-review.dto';

const MAX_SLUG_RETRY_ATTEMPTS = 3;

@Injectable()
export class CoursesService {
  constructor(
    private readonly courseAccessService: CourseAccessService,

    @Inject(COURSE_REPOSITORY)
    private readonly iCourseRepository: ICourseRepository,

    @Inject(CATEGORY_REPOSITORY)
    private readonly iCategoryRepository: ICategoryRepository,

    @Inject(COURSE_REVIEW_REPOSITORY)
    private readonly iCourseReviewRepository: ICourseReviewRepository,
  ) {}

  async getLatestReviewForInstructorCourse(
    instructorId: string,
    courseId: string,
  ): Promise<InstructorCourseLatestReviewResponseDto> {
    const course = await this.iCourseRepository.findById(courseId);

    if (!course) {
      throw new NotFoundException('COURSE_NOT_FOUND');
    }

    await this.courseAccessService.ensureInstructorCanManageCourse(
      courseId,
      instructorId,
    );

    const latestReview =
      await this.iCourseReviewRepository.findLatestCompletedReviewByCourseId(
        courseId,
      );

    if (!latestReview) {
      throw new NotFoundException('COURSE_REVIEW_NOT_FOUND');
    }

    return plainToInstance(
      InstructorCourseLatestReviewResponseDto,
      latestReview,
      {
        excludeExtraneousValues: true,
      },
    );
  }

  private async generateUniqueSlug(
    title: string,
    courseId?: string,
  ): Promise<string> {
    const baseSlug = slugify(title);

    if (!baseSlug) {
      throw new BadRequestException('COURSE_TITLE_CANNOT_GENERATE_SLUG');
    }

    let slug = baseSlug;
    let count = 1;

    while (await this.iCourseRepository.existsBySlug(slug, courseId)) {
      slug = `${baseSlug}-${count++}`;
    }

    return slug;
  }
  private async ensureCategoriesCanBeAssigned(ids: string[]): Promise<void> {
    const uniqueIds = new Set(ids);

    if (uniqueIds.size === 0) {
      throw new BadRequestException('COURSE_REQUIRES_AT_LEAST_ONE_CATEGORY');
    }

    if (uniqueIds.size !== ids.length) {
      throw new BadRequestException('DUPLICATE_CATEGORY_IDS');
    }

    const categories = await this.iCategoryRepository.findManyByIds([
      ...uniqueIds,
    ]);

    if (
      categories.length !== uniqueIds.size ||
      categories.some((category) => !category.isActive)
    ) {
      throw new NotFoundException('CATEGORY_ID_NOT_FOUND');
    }
  }

  private validateCourseQueryRange(dto: {
    minPrice?: number;
    maxPrice?: number;
    publishedFrom?: string;
    publishedTo?: string;
  }): void {
    if (
      dto.minPrice !== undefined &&
      dto.maxPrice !== undefined &&
      dto.minPrice > dto.maxPrice
    ) {
      throw new BadRequestException('MIN_PRICE_CANNOT_EXCEED_MAX_PRICE');
    }

    if (
      dto.publishedFrom !== undefined &&
      dto.publishedTo !== undefined &&
      new Date(dto.publishedFrom) > new Date(dto.publishedTo)
    ) {
      throw new BadRequestException(
        'PUBLISHED_FROM_CANNOT_EXCEED_PUBLISHED_TO',
      );
    }
  }

  private isUniqueSlugConflict(error: unknown): boolean {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
      return false;
    }

    const target = error.meta?.target;

    return (
      error.code === 'P2002' && Array.isArray(target) && target.includes('slug')
    );
  }

  async findAllPublic(
    dto: LearnerCourseQueryDto,
  ): Promise<PaginatedResponse<CourseResponseDto>> {
    this.validateCourseQueryRange(dto);

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
      field: dto.sortField ?? 'publishedAt',
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

    await this.ensureCategoriesCanBeAssigned(categoryIds);

    let course: CourseModel | undefined;

    for (let attempt = 1; attempt <= MAX_SLUG_RETRY_ATTEMPTS; attempt++) {
      const slug = await this.generateUniqueSlug(title);

      try {
        course = await this.iCourseRepository.createDraftCourse({
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
        break;
      } catch (error) {
        if (
          !this.isUniqueSlugConflict(error) ||
          attempt === MAX_SLUG_RETRY_ATTEMPTS
        ) {
          throw error;
        }
      }
    }

    if (!course) {
      throw new BadRequestException('COURSE_SLUG_GENERATION_FAILED');
    }

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

    await this.courseAccessService.ensureInstructorCanManageCourse(
      courseId,
      instructorId,
    );

    if (
      !(
        course.status === CourseStatus.DRAFT ||
        course.status === CourseStatus.CHANGES_REQUESTED
      )
    ) {
      throw new BadRequestException('ONLY_DRAFT_COURSE_CAN_BE_UPDATED');
    }

    if (dto.categoryIds !== undefined) {
      await this.ensureCategoriesCanBeAssigned(dto.categoryIds);
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
      thumbnailUrl: dto.thumbnailUrl,
      certificateEnabled: dto.certificateEnabled,
      categoryIds: dto.categoryIds,
    };

    let updatedCourse: CourseModel | undefined;

    for (let attempt = 1; attempt <= MAX_SLUG_RETRY_ATTEMPTS; attempt++) {
      if (dto.title && dto.title !== course.title) {
        input.slug = await this.generateUniqueSlug(dto.title, course.id);
      }

      try {
        updatedCourse = await this.iCourseRepository.updateDraftCourse(
          courseId,
          cleanData(input),
        );
        break;
      } catch (error) {
        if (
          !this.isUniqueSlugConflict(error) ||
          attempt === MAX_SLUG_RETRY_ATTEMPTS
        ) {
          throw error;
        }
      }
    }

    if (!updatedCourse) {
      throw new BadRequestException('COURSE_SLUG_GENERATION_FAILED');
    }

    return plainToInstance(CourseResponseDto, updatedCourse, {
      excludeExtraneousValues: true,
      groups: [COURSE_VIEW_GROUPS.INSTRUCTOR],
    });
  }

  async submitDraftCourseForReview(
    instructorId: string,
    courseId: string,
  ): Promise<CourseResponseDto> {
    const course = await this.iCourseRepository.findById(courseId);

    if (!course) {
      throw new NotFoundException('COURSE_NOT_FOUND');
    }

    await this.courseAccessService.ensureInstructorCanManageCourse(
      courseId,
      instructorId,
    );

    if (
      !(
        course.status === CourseStatus.DRAFT ||
        course.status === CourseStatus.CHANGES_REQUESTED
      )
    ) {
      throw new BadRequestException(
        'ONLY_DRAFT_OR_CHANGES_REQUESTED_COURSE_CAN_BE_SUBMITTED_FOR_REVIEW',
      );
    }

    const submittedCourse =
      await this.iCourseRepository.submitForReview(courseId);

    if (!submittedCourse) {
      throw new BadRequestException(
        'ONLY_DRAFT_OR_CHANGES_REQUESTED_COURSE_CAN_BE_SUBMITTED_FOR_REVIEW',
      );
    }

    return plainToInstance(CourseResponseDto, submittedCourse, {
      excludeExtraneousValues: true,
      groups: [COURSE_VIEW_GROUPS.INSTRUCTOR],
    });
  }

  async findInstructorCourses(
    instructorId: string,
    dto: InstructorCourseQueryDto,
  ): Promise<PaginatedResponse<CourseResponseDto>> {
    this.validateCourseQueryRange(dto);

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

  async deleteDraftCourse(
    instructorId: string,
    courseId: string,
  ): Promise<{ message: string }> {
    const course = await this.iCourseRepository.findById(courseId);

    if (!course) {
      throw new NotFoundException('COURSE_NOT_FOUND');
    }

    await this.courseAccessService.ensureInstructorCanManageCourse(
      courseId,
      instructorId,
    );

    if (course.status !== CourseStatus.DRAFT) {
      throw new BadRequestException('ONLY_DRAFT_COURSE_CAN_BE_DELETED');
    }

    await this.iCourseRepository.softDelete(courseId);
    return {
      message: 'DRAFT_COURSE_DELETED_SUCCESSFULLY',
    };
  }
}
