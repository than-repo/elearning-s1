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
import { Injectable } from '@nestjs/common';
import { text } from 'node:stream/consumers';
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
    const date = new Date();
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.courseSection.updateMany({
        where: { id: sectionId, deletedAt: null, courseId },
        data: {
          deletedAt: date,
          sectionIndex: -date.getTime(),
          isActive: false,
        },
      });
      if (result.count === 0) {
        return false;
      }

      const sections = await tx.courseSection.findMany({
        where: {
          courseId,
          sectionIndex: { gt: sectionIndex },
          deletedAt: null,
        },
        orderBy: {
          sectionIndex: 'asc',
        },
        select: {
          sectionIndex: true,
          id: true,
        },
      });

      for (const section of sections) {
        await tx.courseSection.update({
          where: { deletedAt: null, id: section.id },
          data: { sectionIndex: section.sectionIndex - 1 },
        });
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
    await this.prisma.$transaction(async (tx) => {
      // await tx.courseSection.update({
      //   where: {
      //     courseId_sectionIndex: {
      //       courseId,
      //       sectionIndex: 0,
      //     },
      //   },
      //   data: { sectionIndex: Number(new Date()) },
      // });

      await Promise.all(
        orderedSectionIds.map((sectionId, index) =>
          tx.courseSection.updateMany({
            where: {
              courseId,
              deletedAt: null,
              id: sectionId,
            },
            data: {
              sectionIndex: -(1 + index),
            },
          }),
        ),
      );

      await Promise.all(
        orderedSectionIds.map((sectionId, index) =>
          tx.courseSection.updateMany({
            where: {
              courseId,
              deletedAt: null,
              id: sectionId,
            },
            data: {
              sectionIndex: index,
            },
          }),
        ),
      );
    });

    const sections = await this.prisma.courseSection.findMany({
      where: { deletedAt: null, courseId },
    });

    return sections.map((section) => this.toDomain(section));
  }
  async shiftSectionsAfterDelete(
    courseId: string,
    deletedSectionIndex: number,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.courseSection.updateMany({
        where: {
          courseId,
          deletedAt: null,
          sectionIndex: {
            gt: deletedSectionIndex,
          },
        },
        data: {
          sectionIndex: {
            decrement: 1,
          },
        },
      });
    });
  }
}
