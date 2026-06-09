//src\features\courses\repositories\course-section-repository.ts
import { PrismaService } from 'src/core/database/prisma.service';
import {
  CourseSection,
  CourseSectionOrderByInput,
  CourseSectionWhereInput,
  CreateAtEndCourseSectionInput,
  CreateCourseSectionInput,
  FindManyCourseSectionParams,
  ICourseSectionRepository,
  InvalidCourseSectionDeleteError,
  InvalidCourseSectionOrderError,
  UpdateCourseSectionInput,
} from '../interfaces/course-section.repository.interface';

import {
  Prisma,
  CourseSection as PrismaCourseSection,
} from 'generated/prisma/client';
import { Injectable } from '@nestjs/common';

@Injectable()
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
  private isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    );
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
  async createAtEnd(
    input: CreateAtEndCourseSectionInput,
  ): Promise<CourseSection | null> {
    const maxAttempts = 3;
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const nextCourseSectionIndex = await this.getNextSectionIndex(
          input.courseId,
        );
        return await this.create({
          ...input,
          sectionIndex: nextCourseSectionIndex,
        } satisfies CreateCourseSectionInput);
      } catch (error) {
        if (!this.isUniqueConstraintError(error) || i === maxAttempts - 1) {
          throw error;
        }
      }
    }
    return null;
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
      where: { id, deletedAt: null },
      data: {
        ...input,
      },
    });

    return this.toDomain(section);
  }
  async softDeleteAndShiftSections(
    sectionId: string,
    courseId: string,
    sectionIndex: number,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const sectionAggregate = await tx.courseSection.aggregate({
        where: {
          courseId,
        },
        _min: {
          sectionIndex: true,
        },
      });

      const lowerSectionIndex = sectionAggregate._min.sectionIndex ?? 0;

      const softDeletedSectionIndex = lowerSectionIndex - 1;

      const softDeleteResult = await tx.courseSection.updateMany({
        where: {
          id: sectionId,
          courseId,
          deletedAt: null,
          sectionIndex,
        },
        data: {
          sectionIndex: softDeletedSectionIndex,
          deletedAt: new Date(),
          isActive: false,
        },
      });

      if (softDeleteResult.count !== 1) {
        throw new InvalidCourseSectionDeleteError();
      }

      const sectionToShift = await tx.courseSection.findMany({
        where: {
          courseId,
          deletedAt: null,
          sectionIndex: { gt: sectionIndex },
        },
        orderBy: {
          sectionIndex: 'asc',
        },
        select: {
          id: true,
          sectionIndex: true,
        },
      });

      for (const section of sectionToShift) {
        const shiftResult = await tx.courseSection.updateMany({
          where: {
            id: section.id,
            courseId,
            deletedAt: null,
            sectionIndex: section.sectionIndex,
          },
          data: {
            sectionIndex: section.sectionIndex - 1,
          },
        });

        if (shiftResult.count !== 1) {
          throw new InvalidCourseSectionDeleteError();
        }
      }
      return true;
    });
  }
  async restore(id: string, sectionIndex: number): Promise<CourseSection> {
    const section = await this.prisma.courseSection.update({
      where: { id },
      data: { deletedAt: null, isActive: true, sectionIndex },
    });

    return this.toDomain(section);
  }
  async changeActive(
    sectionId: string,
    courseId: string,
    isActive: boolean,
  ): Promise<CourseSection | null> {
    const section = await this.prisma.$transaction(async (tx) => {
      const updateResult = await tx.courseSection.updateMany({
        where: {
          id: sectionId,
          courseId,
          deletedAt: null,
        },
        data: { isActive },
      });

      if (updateResult.count !== 1) {
        return null;
      }

      return tx.courseSection.findFirst({
        where: {
          id: sectionId,
          courseId,
          deletedAt: null,
        },
      });
    });

    return section ? this.toDomain(section) : null;
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
    const result = await this.prisma.courseSection.aggregate({
      where: {
        courseId,
        deletedAt: null,
      },
      _max: {
        sectionIndex: true,
      },
    });

    return result._max.sectionIndex === null ? 0 : result._max.sectionIndex + 1;
  }
  async existsInCourse(sectionId: string, courseId: string): Promise<boolean> {
    const count = await this.prisma.courseSection.count({
      where: {
        id: sectionId,
        courseId,
        deletedAt: null,
        course: {
          isActive: true,
          deletedAt: null,
        },
      },
    });

    return count > 0;
  }

  //Support drags and drop
  async reorderSections(
    courseId: string,
    orderedSectionIds: string[],
  ): Promise<CourseSection[]> {
    const sections = await this.prisma.$transaction(async (tx) => {
      const currentSections = await tx.courseSection.findMany({
        where: {
          courseId,
          deletedAt: null,
        },
        orderBy: {
          sectionIndex: 'asc',
        },
        select: {
          id: true,
        },
      });

      const orderedSectionIdSet = new Set(orderedSectionIds);
      const currentSectionIdSet = new Set(
        currentSections.map((section) => section.id),
      );

      const hasInvalidOrder: boolean =
        orderedSectionIdSet.size !== orderedSectionIds.length ||
        orderedSectionIds.length !== currentSections.length ||
        orderedSectionIds.some(
          (sectionId) => !currentSectionIdSet.has(sectionId),
        );

      if (hasInvalidOrder) {
        throw new InvalidCourseSectionOrderError();
      }

      const sectionIndexAggregate = await tx.courseSection.aggregate({
        where: {
          courseId,
        },
        _min: {
          sectionIndex: true,
        },
      });
      const lowestSectionIndex = sectionIndexAggregate._min.sectionIndex ?? 0;
      const temporaryStartIndex = lowestSectionIndex - orderedSectionIds.length;

      for (const [index, sectionId] of orderedSectionIds.entries()) {
        const temporaryUpdateResult = await tx.courseSection.updateMany({
          where: {
            courseId,
            deletedAt: null,
            id: sectionId,
          },
          data: {
            sectionIndex: temporaryStartIndex + index,
          },
        });

        if (temporaryUpdateResult.count !== 1) {
          throw new InvalidCourseSectionOrderError();
        }
      }

      for (const [index, sectionId] of orderedSectionIds.entries()) {
        const finalUpdateResult = await tx.courseSection.updateMany({
          where: {
            courseId,
            deletedAt: null,
            id: sectionId,
          },
          data: {
            sectionIndex: index,
          },
        });

        if (finalUpdateResult.count !== 1) {
          throw new InvalidCourseSectionOrderError();
        }
      }

      return tx.courseSection.findMany({
        where: { deletedAt: null, courseId },
        orderBy: {
          sectionIndex: 'asc',
        },
      });
    });

    return sections.map((section) => this.toDomain(section));
  }
}
