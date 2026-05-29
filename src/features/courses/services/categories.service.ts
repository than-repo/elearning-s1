//src\features\courses\services\categories.service.ts
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaErrorHandler } from 'src/common/utils/prisma-error.util';
import { CreateCategoryDto } from '../dtos/category/create-category.dto';
import type {
  Category,
  CategoryOrderByInput,
  CategoryWhereInput,
  CreateCategoryInput,
  FindManyCategoryParams,
  ICategoryRepository,
  UpdateCategoryInput,
} from '../interfaces/category.repository.interface';
import { plainToInstance } from 'class-transformer';
import { CategoryResponseDto } from '../dtos/category/category-response.dto';
import { slugify } from 'src/common/utils/slugify.util';
import { UpdateCategoryDto } from '../dtos/category/update-category.dto';
import { cleanData } from 'src/common/utils/clean-data-util';
import { CATEGORY_REPOSITORY } from '../repositories/category-repository.token';
import { CategoryQueryDto } from '../dtos/category/category-query.dto';
import { PaginatedResponse } from '../dtos/category/paginated-response.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly iCategoryRepository: ICategoryRepository,
  ) {}

  private async generateSlug(name: string): Promise<string> {
    let slug: string = slugify(name);
    let counter = 1;
    while (await this.iCategoryRepository.existsBySlug(slug)) {
      slug = `${slugify(name)}-${counter++}`;
    }
    return slug;
  }
  async createCategory(dto: CreateCategoryDto): Promise<CategoryResponseDto> {
    // 1. Slug generation
    let slug = this.generateSlug(dto.name);

    // 2. Parent validation
    if (dto.parentId) {
      const parent = await this.iCategoryRepository.findById(dto.parentId);
      if (!parent) {
        throw new NotFoundException(
          `Parent category with id ${dto.parentId} not found`,
        );
      }
    }

    // 3. Order
    const order = await this.iCategoryRepository.getNextOrder(dto.parentId);

    const input: CreateCategoryInput = {
      name: dto.name,
      slug,
      description: dto.description,
      parentId: dto.parentId,
      order,
    };

    try {
      const newCategory = await this.iCategoryRepository.create(input);
      return plainToInstance(CategoryResponseDto, newCategory);
    } catch (error) {
      PrismaErrorHandler.handle(error, { entity: 'Category' });
    }
  }

  async updateCategory(
    id: string,
    dto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const currentCategory = await this.iCategoryRepository.findById(id);

    if (!currentCategory) {
      throw new NotFoundException('Not found category');
    }

    const input: UpdateCategoryInput = {
      name: dto.name,
      description: dto.description,
      parentId: dto.parentId,
      isActive: dto.isActive,
    };
    if (dto.name && dto.name !== currentCategory.name) {
      input.slug = await this.generateSlug(dto.name);
    }

    if (
      dto.parentId !== undefined &&
      dto.parentId !== currentCategory.parentId
    ) {
      input.order = await this.iCategoryRepository.getNextOrder(dto.parentId);
    }

    const cleanedInput = cleanData(input);
    try {
      const updatedCategory: Category = await this.iCategoryRepository.update(
        id,
        cleanedInput,
      );
      return plainToInstance(CategoryResponseDto, updatedCategory);
    } catch (error) {
      PrismaErrorHandler.handle(error, { entity: 'Category' });
    }
  }

  async setCategoryActiveStatus(
    id: string,
    isActive: boolean,
  ): Promise<CategoryResponseDto> {
    const category = await this.iCategoryRepository.findById(id);

    if (!category) {
      throw new NotFoundException(`Category with id ${id} not found`);
    }

    const updatedCategory = await this.iCategoryRepository.update(id, {
      isActive,
    });

    return plainToInstance(CategoryResponseDto, updatedCategory);
  }

  async softDeleteCategory(id: string): Promise<CategoryResponseDto> {
    const categoryExists = await this.iCategoryRepository.findById(id);
    if (!categoryExists) {
      throw new NotFoundException(`Category with id ${id} not found`);
    }
    const softDeletedCate = await this.iCategoryRepository.softDelete(id);

    return plainToInstance(CategoryResponseDto, softDeletedCate);
  }

  async restoreCategory(id: string): Promise<CategoryResponseDto> {
    const category =
      await this.iCategoryRepository.findByIdIncludingDeleted(id);
    if (!category) {
      throw new NotFoundException(`Category with id ${id} not found`);
    }
    const input: UpdateCategoryInput = {
      deletedAt: null,
    };
    const restoreCategory = await this.iCategoryRepository.update(id, input);
    return plainToInstance(CategoryResponseDto, restoreCategory);
  }

  async getCategories(
    query: CategoryQueryDto,
  ): Promise<PaginatedResponse<CategoryResponseDto>> {
    const {
      search,
      parentId,
      isActive,
      includeDeleted,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 10,
    } = query;

    const where: CategoryWhereInput = {
      nameContains: search,
      parentId,
      includeDeleted,
    };

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const orderBy: CategoryOrderByInput = {
      field: sortBy,
      direction: sortOrder,
    };

    const params: FindManyCategoryParams = {
      where,
      orderBy,
      limit,
      offset: (page - 1) * limit,
    };

    const [categories, total] = await Promise.all([
      this.iCategoryRepository.findMany(params),
      this.iCategoryRepository.count(params),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: plainToInstance(CategoryResponseDto, categories) as Category[],
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
