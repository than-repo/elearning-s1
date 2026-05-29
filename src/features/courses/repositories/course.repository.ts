import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/core/database/prisma.service';
import {
  CourseModel,
  CourseWhereInput,
  CreateCourseInput,
  FindManyCourseParams,
  ICourseRepository,
  UpdateCourseInput,
} from '../interfaces/course.repository.interface';
import { Course as PrismaCourse, Prisma } from 'generated/prisma/client';

@Injectable()
export class CourseRepository implements ICourseRepository {
  constructor(private readonly prisma: PrismaService) {}

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
      price: course.price,
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

  create(input: CreateCourseInput): Promise<CourseModel> {
    throw new Error('Method not implemented.');
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
      },
    });

    return course ? this.toCourseModel(course) : null;
  }
  findMany(params?: FindManyCourseParams): Promise<CourseModel[]> {
    throw new Error('Method not implemented.');
  }
  count(where?: CourseWhereInput): Promise<number> {
    throw new Error('Method not implemented.');
  }
  update(id: string, input: UpdateCourseInput): Promise<CourseModel> {
    throw new Error('Method not implemented.');
  }
  softDelete(id: string): Promise<CourseModel> {
    throw new Error('Method not implemented.');
  }
  restore(id: string): Promise<CourseModel> {
    throw new Error('Method not implemented.');
  }
  publish(id: string): Promise<CourseModel> {
    throw new Error('Method not implemented.');
  }
  unpublish(id: string): Promise<CourseModel> {
    throw new Error('Method not implemented.');
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
