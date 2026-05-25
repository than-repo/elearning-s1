import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CoursesRepository } from '../repositories/courses.repository';

import { Course, Prisma } from 'generated/prisma/client';
import { PrismaErrorHandler } from 'src/common/utils/prisma-error.util';
import { CreateCategoryDto } from '../dtos/create-category.dto';
import type {
  Category,
  CreateCategoryInput,
  ICategoryRepository,
  UpdateCategoryInput,
} from '../interfaces/category.repository.interface';
import { plainToInstance } from 'class-transformer';
import { CategoryResponseDto } from '../dtos/category-response.dto';
import { slugify } from 'src/common/utils/slugify.util';
import { UpdateCategoryDto } from '../dtos/update-category.dto';
import { cleanData } from 'src/common/utils/clean-data-util';
import { CATEGORY_REPOSITORY } from '../repositories/category-repository.token';

@Injectable()
export class CoursesService {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly iCoursesRepository: ICategoryRepository,
  ) {}
  // private buildWhereInput(query: any): Prisma.CourseWhereInput {
  //   const where: Prisma.CourseWhereInput = {};
  //   const {
  //     search,
  //     level,
  //     minPrice,
  //     maxPrice,
  //     // base
  //     status,
  //     isActive,
  //     instructorId,
  //   } = query;
  //   //Based condition
  //   if (search) {
  //     where.OR = [
  //       { title: { contains: search } },
  //       { description: { contains: search } },
  //       { shortDescription: { contains: search } },
  //     ];
  //   }
  //   if (level) {
  //     where.level = level;
  //   }
  //   if (minPrice !== undefined || maxPrice !== undefined) {
  //     where.price = {};
  //     if (minPrice !== undefined) where.price.gte = minPrice;
  //     if (maxPrice !== undefined) where.price.lte = maxPrice;
  //   }

  //   if (status) {
  //     where.status = status;
  //   }
  //   if (isActive !== undefined) {
  //     where.isActive = isActive;
  //   }
  //   if (instructorId !== undefined) {
  //     where.instructors = { some: { instructorId } }; ///Note
  //   }
  //   return where;
  // }
  // async findManyForLearner(
  //   query: LearnerGetCoursesQueryDto,
  // ): Promise<GetCoursesResponseDto<Course>>:any | any {
  //   //Learner only can find actived coruses.

  //   const where: Prisma.CourseWhereInput = this.buildWhereInput({
  //     ...query,
  //     isActive: true,
  //     status: 'PUBLISHED',
  //   });
  //   const { limit, page, sortBy, sortOrder } = query;
  //   const take = limit;
  //   const skip = (page - 1) * limit;
  //   const orderBy: Prisma.CourseOrderByWithRelationInput = {
  //     [sortBy]: sortOrder,
  //   };
  //   try {
  //     const courses = await this.coursesRepository.findMany(
  //       where,
  //       take,
  //       skip,
  //       orderBy,
  //     );

  //     const total = await this.coursesRepository.count(where);
  //     const totalPage = Math.ceil(total / limit);
  //     return {
  //       data: courses,
  //       meta: {
  //         page,
  //         limit,
  //         total,
  //         totalPage,
  //         hasNext: page < totalPage,
  //         hasPrev: page > 1,
  //       },
  //     };
  //   } catch (error) {
  //     PrismaErrorHandler.handle(error, { entity: 'Course' });
  //   }
  // }

  // async createCategory(dto: CreateCategoryDto) {
  //   const newCategory = this.coursesRepository.createCategory(dto);
  // }

  // =======================CATEGORY============================

  async createCategory(dto: CreateCategoryDto): Promise<CategoryResponseDto> {
    // 1. Slug generation
    let slug = slugify(dto.name);
    let counter = 1;
    while (await this.iCoursesRepository.existsBySlug(slug)) {
      slug = `${slugify(dto.name)}-${counter++}`;
    }

    // 2. Parent validation
    if (dto.parentId) {
      const parent = await this.iCoursesRepository.findById(dto.parentId);
      if (!parent) {
        throw new NotFoundException(
          `Parent category with id ${dto.parentId} not found`,
        );
      }
    }

    // 3. Order
    const order = await this.iCoursesRepository.getNextOrder(dto.parentId);

    const input: CreateCategoryInput = {
      name: dto.name,
      slug,
      description: dto.description,
      parentId: dto.parentId,
      order,
    };

    try {
      const newCategory = await this.iCoursesRepository.create(input);
      return plainToInstance(CategoryResponseDto, newCategory);
    } catch (error) {
      PrismaErrorHandler.handle(error, { entity: 'Category' });
    }
  }

  async updateCategory(
    id: string,
    dto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const input: UpdateCategoryInput = {
      name: dto.name,
      description: dto.description,
      parentId: dto.parentId,
      order: dto.order,
      isActive: dto.isActive,
    };

    const cleanedInput = cleanData(input);
    try {
      const updatedCategory: Category = await this.iCoursesRepository.update(
        id,
        cleanedInput,
      );
      return plainToInstance(CategoryResponseDto, updatedCategory);
    } catch (error) {
      PrismaErrorHandler.handle(error, { entity: 'Category' });
    }
  }

  async deteleCategory() {}
}
