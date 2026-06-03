//src\features\courses\repositories\course.repository.ts
import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/core/database/prisma.service';
import {
  CourseModel,
  CourseOrderByInput,
  CourseWhereInput,
  CreateCourseInput,
  CreateDraftCourseInput,
  FindManyCourseParams,
  ICourseRepository,
  UpdateCourseInput,
} from '../interfaces/course.repository.interface';
import {
  Course as PrismaCourse,
  Prisma,
  CourseStatus,
} from 'generated/prisma/client';

@Injectable()
export class CourseRepository implements ICourseRepository {
  constructor(private readonly prisma: PrismaService) {}

  ///=====================================================
  private toCourseModel(course: PrismaCourse): CourseModel {
    return {
      id: course.id,
      title: course.title,
      slug: course.slug,
      shortDescription: course.shortDescription,
      description: course.description,
      whatYouWillLearn: this.toStringArrayOrNull(course.whatYouWillLearn),
      requirements: this.toStringArrayOrNull(course.requirements),
      thumbnailUrl: course.thumbnailUrl,
      cloudinaryPublicId: course.cloudinaryPublicId,
      level: course.level,
      status: course.status,
      price: course.price?.toNumber() ?? null,
      language: course.language,
      durationInMinutes: course.durationInMinutes,
      isActive: course.isActive,
      certificateEnabled: course.certificateEnabled,
      publishedAt: course.publishedAt,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
      deletedAt: course.deletedAt,
    };
  }

  private toStringArrayOrNull(value: Prisma.JsonValue): string[] | null {
    if (value === null) return null;

    if (!Array.isArray(value)) return null;

    return value.filter((item): item is string => typeof item === 'string');
  }

  private buildWhere(
    courseWhereInput?: CourseWhereInput,
  ): Prisma.CourseWhereInput {
    const prismaWhere: Prisma.CourseWhereInput = {
      deletedAt: null,
    };
    if (courseWhereInput === undefined) {
      return prismaWhere;
    }
    const {
      search,
      level,
      status,
      isActive,
      certificateEnabled,
      categoryId,
      instructorId,
      minPrice,
      maxPrice,
      language,
      publishedFrom,
      publishedTo,
    } = courseWhereInput;

    if (search) {
      prismaWhere.OR = [
        {
          title: {
            contains: search,
          },
        },
        {
          shortDescription: {
            contains: search,
          },
        },
      ];
    }

    if (level) {
      prismaWhere.level = Array.isArray(level) ? { in: level } : level;
    }
    //Multiple status
    if (status) {
      prismaWhere.status = Array.isArray(status) ? { in: status } : status;
    }
    if (isActive !== undefined) {
      prismaWhere.isActive = isActive;
    }
    if (certificateEnabled !== undefined) {
      prismaWhere.certificateEnabled = certificateEnabled;
    }

    if (categoryId) {
      prismaWhere.courseCategories = {
        some: {
          categoryId,
        },
      };
    }
    if (instructorId) {
      prismaWhere.instructors = { some: { instructorId } };
    }
    if (minPrice !== undefined || maxPrice !== undefined) {
      prismaWhere.price = {};
      if (minPrice !== undefined) {
        prismaWhere.price.gte = minPrice;
      }
      if (maxPrice !== undefined) {
        prismaWhere.price.lt = maxPrice;
      }
    }
    if (language) {
      prismaWhere.language = language;
    }
    if (publishedFrom || publishedTo) {
      prismaWhere.publishedAt = {};

      if (publishedFrom) {
        prismaWhere.publishedAt.gte = publishedFrom;
      }

      if (publishedTo) {
        prismaWhere.publishedAt.lt = publishedTo;
      }
    }

    return prismaWhere;
  }

  private buildOrderBy(
    orderBy?: CourseOrderByInput,
  ): Prisma.CourseOrderByWithRelationInput {
    if (orderBy === undefined) {
      return {
        createdAt: 'desc',
      };
    }

    return {
      [orderBy.field]: orderBy.direction,
    };
  }

  private toPrismaJsonArray(
    value?: string[] | null,
  ): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
    if (value === undefined) return undefined;

    if (value === null) return Prisma.JsonNull;

    return value;
  }
  ///=====================================================
  async findMany(param?: FindManyCourseParams): Promise<CourseModel[]> {
    const courses = await this.prisma.course.findMany({
      where: this.buildWhere(param?.where),
      orderBy: this.buildOrderBy(param?.orderBy),
      take: param?.limit,
      skip: param?.offset,
    });

    return courses.map((course) => {
      return this.toCourseModel(course);
    });
  }

  async create(input: CreateCourseInput): Promise<CourseModel> {
    const course = await this.prisma.course.create({
      data: {
        ...input,
        whatYouWillLearn: this.toPrismaJsonArray(input.whatYouWillLearn),
        requirements: this.toPrismaJsonArray(input.requirements),
      },
    });

    return this.toCourseModel(course);
  }

  async createDraftCourse(input: CreateDraftCourseInput): Promise<CourseModel> {
    const {
      instructorId,
      categoryIds,
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
      status,
    } = input;

    const course = await this.prisma.$transaction(async (tx) => {
      return tx.course.create({
        data: {
          title,
          slug,
          shortDescription,
          description,
          whatYouWillLearn: this.toPrismaJsonArray(whatYouWillLearn),
          requirements: this.toPrismaJsonArray(requirements),
          level,
          price,
          language,
          certificateEnabled,
          status,
          isActive: true,

          instructors: {
            create: {
              instructorId,
              isPrimary: true,
              order: 0,
              isActive: true,
            },
          },

          courseCategories: {
            create: categoryIds.map((categoryId) => ({
              categoryId,
            })),
          },
        },
      });
    });

    return this.toCourseModel(course);
  }
  async findById(id: string): Promise<CourseModel | null> {
    const course = await this.prisma.course.findFirst({
      where: { id, deletedAt: null },
    });

    return course ? this.toCourseModel(course) : null;
  }
  async findActiveById(id: string): Promise<CourseModel | null> {
    const course = await this.prisma.course.findFirst({
      where: {
        id,
        deletedAt: null,
        isActive: true,
      },
    });

    return course ? this.toCourseModel(course) : null;
  }
  async findBySlug(slug: string): Promise<CourseModel | null> {
    const course = await this.prisma.course.findFirst({
      where: {
        slug,
        deletedAt: null,
        isActive: true,
        status: CourseStatus.PUBLISHED,
      },
    });

    return course ? this.toCourseModel(course) : null;
  }

  async count(where?: CourseWhereInput): Promise<number> {
    return this.prisma.course.count({
      where: this.buildWhere(where),
    });
  }
  async update(id: string, input: UpdateCourseInput): Promise<CourseModel> {
    const course = await this.prisma.course.update({
      where: { id },
      data: {
        ...input,
        whatYouWillLearn: this.toPrismaJsonArray(input.whatYouWillLearn),
        requirements: this.toPrismaJsonArray(input.requirements),
      },
    });

    return this.toCourseModel(course);
  }
  async softDelete(id: string): Promise<CourseModel> {
    const course = await this.prisma.course.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });
    return this.toCourseModel(course);
  }
  async restore(id: string): Promise<CourseModel> {
    const course = await this.prisma.course.update({
      where: { id },
      data: {
        deletedAt: null,
      },
    });
    return this.toCourseModel(course);
  }
  async publish(id: string): Promise<CourseModel> {
    const course = await this.prisma.course.update({
      where: { id },
      data: {
        publishedAt: new Date(),
        status: CourseStatus.PUBLISHED,
        isActive: true,
      },
    });
    return this.toCourseModel(course);
  }
  async unpublish(id: string): Promise<CourseModel> {
    const course = await this.prisma.course.update({
      where: { id },
      data: {
        status: CourseStatus.DRAFT,
        publishedAt: null,
      },
    });

    return this.toCourseModel(course);
  }
  async existsBySlug(slug: string, excludeId?: string): Promise<boolean> {
    const count = await this.prisma.course.count({
      where: {
        slug,
        deletedAt: null,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });

    return count > 0;
  }
}
