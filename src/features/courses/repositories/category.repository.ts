import { PrismaService } from 'src/core/database/prisma.service';
import {
  Category,
  CategoryWhereInput,
  CreateCategoryInput,
  FindManyCategoryParams,
  ICategoryRepository,
  UpdateCategoryInput,
} from '../interfaces/category.repository.interface';
import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';

@Injectable()
export class CategoryRepository implements ICategoryRepository {
  constructor(private readonly prisma: PrismaService) {}
  private toCategoryModel(category: Prisma.CategoryModel): Category {
    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      parentId: category.parentId,
      order: category.order,
      isActive: category.isActive,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
      deletedAt: category.deletedAt,
    };
  }
  private buildWhere(where: CategoryWhereInput = {}): Record<string, unknown> {
    const prismaWhere: Record<string, unknown> = {};

    if (!where.includeDeleted) prismaWhere.deletedAt = null;
    if (where.id) prismaWhere.id = where.id;
    if (where.slug) prismaWhere.slug = where.slug;
    if (where.parentId !== undefined) prismaWhere.parentId = where.parentId;
    if (where.isActive !== undefined) prismaWhere.isActive = where.isActive;

    if (where.nameContains) {
      prismaWhere.name = {
        contains: where.nameContains,
      };
    }

    return prismaWhere;
  }

  async getNextOrder(parentId?: string | null): Promise<number> {
    const max = await this.prisma.category.aggregate({
      where: { parentId: parentId ?? null, deletedAt: null },
      _max: { order: true },
    });

    return (max._max.order ?? 0) + 1;
  }
  async create(input: CreateCategoryInput): Promise<Category> {
    const newCategory: Category = await this.prisma.category.create({
      data: input,
    });
    return newCategory;
  }
  async findById(id: string): Promise<Category | null> {
    return this.prisma.category.findFirst({
      where: { id, deletedAt: null },
    });
  }
  async findByIdIncludingDeleted(id: string): Promise<Category | null> {
    return this.prisma.category.findUnique({
      where: { id },
    });
  }

  async findBySlug(slug: string): Promise<Category | null> {
    return this.prisma.category.findFirst({
      where: { slug, deletedAt: null },
    });
  }
  async findMany(params?: FindManyCategoryParams): Promise<Category[]> {
    const prismaWhere = this.buildWhere(params?.where);

    return this.prisma.category.findMany({
      where: prismaWhere,
      orderBy: params?.orderBy
        ? { [params.orderBy.field]: params.orderBy.direction }
        : { createdAt: 'desc' },
      take: params?.limit,
      skip: params?.offset,
    });
  }
  async findManyByIds(ids: string[]): Promise<Category[]> {
    const categories = await this.prisma.category.findMany({
      where: {
        id: {
          in: ids,
        },
        deletedAt: null,
      },
    });
    return categories;
  }

  async count(params?: { where?: CategoryWhereInput }): Promise<number> {
    return this.prisma.category.count({
      where: this.buildWhere(params?.where),
    });
  }
  async findAllActive(): Promise<Category[]> {
    const categories = await this.prisma.category.findMany({
      where: {
        deletedAt: null,
        isActive: true,
      },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });

    return categories.map((category) => this.toCategoryModel(category));
  }
  async update(id: string, input: UpdateCategoryInput): Promise<Category> {
    return this.prisma.category.update({
      where: { id },
      data: { ...input, updatedAt: new Date() },
    });
  }
  async softDelete(id: string): Promise<Category> {
    return this.prisma.category.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }
  async existsBySlug(slug: string): Promise<boolean> {
    const count = await this.prisma.category.count({
      where: { slug, deletedAt: null },
    });
    return count > 0;
  }
  async hasAssociatedCourses(id: string): Promise<boolean> {
    // Many-to-Many via CourseCategory junction table
    const count = await this.prisma.courseCategory.count({
      where: { categoryId: id },
    });
    return count > 0;
  }
}
