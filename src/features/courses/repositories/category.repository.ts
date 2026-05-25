import { PrismaService } from 'src/core/database/prisma.service';
import {
  Category,
  CategoryWithChildren,
  CreateCategoryInput,
  FindManyCategoryParams,
  ICategoryRepository,
  UpdateCategoryInput,
} from '../interfaces/category.repository.interface';

export class CategoryRepository implements ICategoryRepository {
  constructor(private readonly prisma: PrismaService) {}
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
  findBySlug(slug: string): Promise<Category | null> {
    return this.prisma.category.findFirst({
      where: { slug, deletedAt: null },
    });
  }
  findMany(params?: FindManyCategoryParams): Promise<Category[]> {
    throw new Error('Method not implemented.');
  }
  findAllAsTree(): Promise<CategoryWithChildren[]> {
    throw new Error('Method not implemented.');
  }
  update(id: string, input: UpdateCategoryInput): Promise<Category> {
    return this.prisma.category.update({
      where: { id },
      data: { ...input, updatedAt: new Date() },
    });
  }
  softDelete(id: string): Promise<boolean> {
    throw new Error('Method not implemented.');
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
