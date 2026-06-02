//src\features\courses\repositories\course-section-repository.ts
import { PrismaService } from 'src/core/database/prisma.service';
import {
  CourseSection,
  CourseSectionOrderByInput,
  CourseSectionWhereInput,
  CreateCourseSectionInput,
  FindManyCourseSectionParams,
  ICourseSectionRepository,
  UpdateCourseSectionInput,
} from '../interfaces/course-section.repository.interface';

import {
  Prisma,
  CourseSection as PrismaCourseSection,
} from 'generated/prisma/client';
export class CourseSectionRepository implements ICourseSectionRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toDomain(section: PrismaCourseSection): CourseSection {
    return {
      id: section.id,
      courseId: section.courseId,
      title: section.title,
      description: section.description,
      sectionIndex: section.sectionIndex,
      isActive: section.isActive,
      createdAt: section.createdAt,
      updatedAt: section.updatedAt,
      deletedAt: section.deletedAt,
    };
  }

  private buildWhere(
    where?: CourseSectionWhereInput,
  ): Prisma.CourseSectionWhereInput {
    const wherePrisma: Prisma.CourseSectionWhereInput = {};
    const { id, courseId, isActive, includeDeleted, titleContains } =
      where ?? {};
    if (id) wherePrisma.id = id;
    if (courseId) wherePrisma.courseId = courseId;
    if (isActive !== undefined) wherePrisma.isActive = isActive;
    if (includeDeleted !== true) wherePrisma.deletedAt = null;
    if (titleContains)
      wherePrisma.OR = [{ title: { contains: titleContains } }];

    return wherePrisma;
  }
  private buildOrderBy(
    orderBy?: CourseSectionOrderByInput,
  ): Prisma.CourseSectionOrderByWithRelationInput {
    if (!orderBy) return { sectionIndex: 'asc' };
    return {
      [orderBy?.field]: orderBy?.direction,
    };
  }

  private readonly DEFAULT_LIMIT = 10;
  private readonly MAX_LIMIT = 100;

  private normalizeLimit(limit?: number): number {
    if (!limit || limit < 1) return this.DEFAULT_LIMIT;
    return Math.min(limit, this.MAX_LIMIT);
  }
  // Basic CRUD
  async create(input: CreateCourseSectionInput): Promise<CourseSection> {
    const section = await this.prisma.courseSection.create({
      data: {
        ...input,
      },
    });
    return this.toDomain(section);
  }
  async findById(id: string): Promise<CourseSection | null> {
    const section = await this.prisma.courseSection.findFirst({
      where: { id, deletedAt: null },
    });

    return section ? this.toDomain(section) : null;
  }
  async findByIdIncludingDeleted(id: string): Promise<CourseSection | null> {
    const section = await this.prisma.courseSection.findFirst({
      where: { id },
    });

    return section ? this.toDomain(section) : null;
  }
  async update(
    id: string,
    input: UpdateCourseSectionInput,
  ): Promise<CourseSection> {
    const section = await this.prisma.courseSection.update({
      where: { id },
      data: {
        ...input,
      },
    });

    return this.toDomain(section);
  }
  async softDelete(id: string): Promise<CourseSection> {
    const section = await this.prisma.courseSection.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    return this.toDomain(section);
  }
  async restore(id: string): Promise<CourseSection> {
    const section = await this.prisma.courseSection.update({
      where: { id },
      data: { deletedAt: null },
    });

    return this.toDomain(section);
  }
  async changeActive(id: string, isActive: boolean): Promise<CourseSection> {
    const section = await this.prisma.courseSection.update({
      where: { id },
      data: { isActive: isActive },
    });

    return this.toDomain(section);
  }

  // Query / pagination
  async findMany(
    params?: FindManyCourseSectionParams,
  ): Promise<CourseSection[]> {
    const sections = await this.prisma.courseSection.findMany({
      where: this.buildWhere(params?.where),
      orderBy: this.buildOrderBy(params?.orderBy),
      skip: params?.offset,
      take: this.normalizeLimit(params?.limit),
    });

    return sections.map((section) => this.toDomain(section));
  }
  async count(params?: { where?: CourseSectionWhereInput }): Promise<number> {
    return this.prisma.courseSection.count({
      where: this.buildWhere(params?.where),
    });
  }
  async findByCourseId(courseId: string): Promise<CourseSection[]> {
    const sections = await this.prisma.courseSection.findMany({
      where: {
        courseId,
        deletedAt: null,
      },
      orderBy: {
        sectionIndex: 'asc',
      },
    });

    return sections.map((section) => this.toDomain(section));
  }
  async getNextSectionIndex(courseId: string): Promise<number> {
    const lastSectionIndex = await this.prisma.courseSection.aggregate({
      where: { courseId },
      _max: { sectionIndex: true },
    });

    return (lastSectionIndex._max.sectionIndex ?? 0) + 1;
  }
  async existsInCourse(sectionId: string, courseId: string): Promise<boolean> {
    const count = await this.prisma.courseSection.count({
      where: {
        id: sectionId,
        courseId,
        deletedAt: null,
      },
    });

    return count > 0;
  }

  /**
   * Support drags and drop
   */
  async reorderSections(
    courseId: string,
    orderedSectionIds: string[],
  ): Promise<CourseSection[]> {
    await this.prisma.$transaction(
      orderedSectionIds.map((sectionId, index) =>
        this.prisma.courseSection.updateMany({
          where: {
            id: sectionId,
            courseId,
            deletedAt: null,
          },
          data: {
            sectionIndex: index + 1,
          },
        }),
      ),
    );

    const sections = await this.prisma.courseSection.findMany({
      where: {
        courseId,
        deletedAt: null,
      },
      orderBy: {
        sectionIndex: 'asc',
      },
    });

    return sections.map((section) => this.toDomain(section));
  }
}
