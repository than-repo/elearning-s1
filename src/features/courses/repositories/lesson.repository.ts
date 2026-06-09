import { PrismaService } from 'src/core/database/prisma.service';
import { Prisma, Lesson as PrismaLesson } from 'generated/prisma/client';
import {
  CreateLessonInput,
  FindManyLessonParams,
  ILessonRepository,
  Lesson,
  LessonOrderByInput,
  LessonWhereInput,
  UpdateLessonInput,
} from '../interfaces/lesson.repository.interface';
import { Injectable } from '@nestjs/common';
@Injectable()
export class LessonRepository implements ILessonRepository {
  constructor(private readonly prisma: PrismaService) {}
  private toDomain(lesson: PrismaLesson): Lesson {
    return {
      id: lesson.id,
      sectionId: lesson.sectionId,
      title: lesson.title,
      description: lesson.description,
      lessonIndex: lesson.lessonIndex,
      isActive: lesson.isActive,
      createdAt: lesson.createdAt,
      updatedAt: lesson.updatedAt,
      deletedAt: lesson.deletedAt,
    };
  }
  private readonly DEFAULT_LIMIT = 10;
  private readonly MAX_LIMIT = 100;

  private normalizeLimit(limit?: number): number {
    if (!limit || limit < 1) return this.DEFAULT_LIMIT;
    return Math.min(limit, this.MAX_LIMIT);
  }

  private buildWhere(where?: LessonWhereInput): Prisma.LessonWhereInput {
    const wherePrisma: Prisma.LessonWhereInput = {};

    const { id, sectionId, isActive, includeDeleted, titleContains } =
      where ?? {};

    if (id) wherePrisma.id = id;

    if (sectionId) wherePrisma.sectionId = sectionId;

    if (isActive !== undefined) {
      wherePrisma.isActive = isActive;
    }

    if (includeDeleted !== true) {
      wherePrisma.deletedAt = null;
    }

    if (titleContains) {
      wherePrisma.title = {
        contains: titleContains,
      };
    }

    return wherePrisma;
  }

  private buildOrderBy(
    orderBy?: LessonOrderByInput,
  ): Prisma.LessonOrderByWithRelationInput {
    if (!orderBy) {
      return {
        lessonIndex: 'asc',
      };
    }

    return {
      [orderBy.field]: orderBy.direction,
    };
  }
  //Basic CRUD
  async create(input: CreateLessonInput): Promise<Lesson> {
    const lesson = await this.prisma.lesson.create({
      data: {
        ...input,
      },
    });
    return this.toDomain(lesson);
  }
  async findById(id: string): Promise<Lesson | null> {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id, deletedAt: null },
    });
    return lesson ? this.toDomain(lesson) : null;
  }
  async findByIdIncludingDeleted(id: string): Promise<Lesson | null> {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id },
    });
    return lesson ? this.toDomain(lesson) : null;
  }
  async update(id: string, input: UpdateLessonInput): Promise<Lesson> {
    const lesson = await this.prisma.lesson.update({
      where: { id },
      data: {
        ...input,
      },
    });
    return this.toDomain(lesson);
  }
  async softDelete(id: string): Promise<Lesson> {
    const lesson = await this.prisma.lesson.update({
      where: {
        id,
      },
      data: {
        deletedAt: new Date(),
        isActive: false,
        lessonIndex: -Number(Date.now()),
      },
    });

    return this.toDomain(lesson);
  }

  async restore(id: string, lessonIndex: number): Promise<Lesson> {
    const lesson = await this.prisma.lesson.update({
      where: {
        id,
      },
      data: {
        deletedAt: null,
        isActive: true,
        lessonIndex,
      },
    });

    return this.toDomain(lesson);
  }

  async changeActive(id: string, isActive: boolean): Promise<Lesson> {
    const lesson = await this.prisma.lesson.update({
      where: {
        id,
      },
      data: {
        isActive,
      },
    });

    return this.toDomain(lesson);
  }

  //Find with pagination
  async findMany(params?: FindManyLessonParams): Promise<Lesson[]> {
    const lessons = await this.prisma.lesson.findMany({
      where: this.buildWhere(params?.where),
      orderBy: this.buildOrderBy(params?.orderBy),
      skip: params?.offset,
      take: this.normalizeLimit(params?.limit),
    });

    return lessons.map((lesson) => this.toDomain(lesson));
  }

  async count(params?: { where?: LessonWhereInput }): Promise<number> {
    return this.prisma.lesson.count({
      where: this.buildWhere(params?.where),
    });
  }
  async findBySectionId(sectionId: string): Promise<Lesson[]> {
    const lessons = await this.prisma.lesson.findMany({
      where: {
        sectionId,
        deletedAt: null,
      },
      orderBy: {
        lessonIndex: 'asc',
      },
    });

    return lessons.map((lesson) => this.toDomain(lesson));
  }

  //helper
  async existsInSection(lessonId: string, sectionId: string): Promise<boolean> {
    const count = await this.prisma.lesson.count({
      where: {
        id: lessonId,
        sectionId,
        deletedAt: null,
        section: {
          deletedAt: null,
          isActive: true,
        },
      },
    });

    return count > 0;
  }
  async getNextLessonIndex(sectionId: string): Promise<number> {
    const result = await this.prisma.lesson.aggregate({
      where: {
        sectionId,
        deletedAt: null,
      },
      _max: {
        lessonIndex: true,
      },
    });

    return result._max.lessonIndex === null ? 0 : result._max.lessonIndex + 1;
  }
  async reorderLessons(
    sectionId: string,
    orderedLessonIds: string[],
  ): Promise<Lesson[]> {
    await this.prisma.$transaction(async (tx) => {
      /**
       * Phase 1:
       * Move all selected lessons to temporary negative indexes.
       * This avoids @@unique([sectionId, lessonIndex]) collision.
       */
      await Promise.all(
        orderedLessonIds.map((lessonId, index) =>
          tx.lesson.updateMany({
            where: {
              id: lessonId,
              sectionId,
              deletedAt: null,
            },
            data: {
              lessonIndex: -(index + 1),
            },
          }),
        ),
      );

      /**
       * Phase 2:
       * Assign final zero-based indexes.
       */
      await Promise.all(
        orderedLessonIds.map((lessonId, index) =>
          tx.lesson.updateMany({
            where: {
              id: lessonId,
              sectionId,
              deletedAt: null,
            },
            data: {
              lessonIndex: index,
            },
          }),
        ),
      );
    });

    const lessons = await this.prisma.lesson.findMany({
      where: {
        sectionId,
        deletedAt: null,
      },
      orderBy: {
        lessonIndex: 'asc',
      },
    });

    return lessons.map((lesson) => this.toDomain(lesson));
  }
  async shiftLessonsAfterDelete(
    sectionId: string,
    deletedLessonIndex: number,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.lesson.updateMany({
        where: {
          sectionId,
          deletedAt: null,
          lessonIndex: {
            gt: deletedLessonIndex,
          },
        },
        data: {
          lessonIndex: {
            decrement: 1,
          },
        },
      });
    });
  }
  async softDeleteAndShift(
    lessonId: string,
    sectionId: string,
    deletedLessonIndex: number,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.lesson.update({
        where: { id: lessonId },
        data: {
          deletedAt: new Date(),
          isActive: false,
          lessonIndex: -Date.now(),
        },
      });

      await tx.lesson.updateMany({
        where: {
          sectionId,
          deletedAt: null,
          isActive: true,
          lessonIndex: {
            gt: deletedLessonIndex,
          },
        },
        data: {
          lessonIndex: {
            decrement: 1,
          },
        },
      });
    });
  }
}
