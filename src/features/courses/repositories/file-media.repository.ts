//src\features\courses\repositories\file-media.repository.ts

import { Injectable } from '@nestjs/common';
import { FileMedia as PrismaFileMedia, Prisma } from 'generated/prisma/client';

import {
  CreateFileMediaInput,
  FileMedia,
  FileMediaOrderByInput,
  FileMediaWhereInput,
  FindManyFileMediaParams,
  IFileMediaRepository,
  UpdateFileMediaInput,
} from '../interfaces/file-media.repository.interface';
import { PrismaService } from 'src/core/database/prisma.service';

@Injectable()
export class FileMediaRepository implements IFileMediaRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly DEFAULT_LIMIT = 10;
  private readonly MAX_LIMIT = 100;

  private toDomain(fileMedia: PrismaFileMedia): FileMedia {
    return {
      id: fileMedia.id,
      lessonId: fileMedia.lessonId,
      cloudinaryPublicId: fileMedia.cloudinaryPublicId,
      url: fileMedia.url,
      type: fileMedia.type,
      filename: fileMedia.filename,
      mimeType: fileMedia.mimeType,
      sizeInBytes: fileMedia.sizeInBytes,
      createdAt: fileMedia.createdAt,
      updatedAt: fileMedia.updatedAt,
      deletedAt: fileMedia.deletedAt,
    };
  }

  // Query Helpers

  private normalizeLimit(limit?: number): number {
    if (!limit || limit < 1) return this.DEFAULT_LIMIT;
    return Math.min(limit, this.MAX_LIMIT);
  }

  private buildWhere(where?: FileMediaWhereInput): Prisma.FileMediaWhereInput {
    const wherePrisma: Prisma.FileMediaWhereInput = {};

    const {
      id,
      lessonId,
      cloudinaryPublicId,
      type,
      filenameContains,
      mimeType,
      includeDeleted,
    } = where ?? {};

    if (id) wherePrisma.id = id;

    if (lessonId) wherePrisma.lessonId = lessonId;

    if (cloudinaryPublicId !== undefined) {
      wherePrisma.cloudinaryPublicId = cloudinaryPublicId;
    }

    if (type !== undefined) {
      wherePrisma.type = type;
    }

    if (filenameContains) {
      wherePrisma.filename = {
        contains: filenameContains,
      };
    }

    if (mimeType) {
      wherePrisma.mimeType = mimeType;
    }

    if (includeDeleted !== true) {
      wherePrisma.deletedAt = null;
    }

    return wherePrisma;
  }

  private buildOrderBy(
    orderBy?: FileMediaOrderByInput,
  ): Prisma.FileMediaOrderByWithRelationInput {
    if (!orderBy) {
      return {
        filename: 'asc',
      };
    }

    return {
      [orderBy.field]: orderBy.direction,
    };
  }
  // Basic CRUD

  async create(input: CreateFileMediaInput): Promise<FileMedia> {
    const fileMedia = await this.prisma.fileMedia.create({
      data: {
        ...input,
      },
    });

    return this.toDomain(fileMedia);
  }

  async findById(id: string): Promise<FileMedia | null> {
    const fileMedia = await this.prisma.fileMedia.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    return fileMedia ? this.toDomain(fileMedia) : null;
  }

  async findByIdInLesson(
    fileMediaId: string,
    lessonId: string,
  ): Promise<FileMedia | null> {
    const fileMedia = await this.prisma.fileMedia.findFirst({
      where: {
        id: fileMediaId,
        lessonId,
        deletedAt: null,
      },
    });

    return fileMedia ? this.toDomain(fileMedia) : null;
  }

  async update(id: string, input: UpdateFileMediaInput): Promise<FileMedia> {
    const fileMedia = await this.prisma.fileMedia.update({
      where: {
        id,
      },
      data: {
        ...input,
      },
    });

    return this.toDomain(fileMedia);
  }

  async updateInLesson(
    fileMediaId: string,
    lessonId: string,
    input: UpdateFileMediaInput,
  ): Promise<FileMedia | null> {
    const fileMedia = await this.prisma.$transaction(async (tx) => {
      const result = await tx.fileMedia.updateMany({
        where: {
          id: fileMediaId,
          lessonId,
          deletedAt: null,
        },
        data: {
          ...input,
        },
      });

      if (result.count !== 1) {
        return null;
      }

      return tx.fileMedia.findFirst({
        where: {
          id: fileMediaId,
          lessonId,
          deletedAt: null,
        },
      });
    });

    return fileMedia ? this.toDomain(fileMedia) : null;
  }

  async delete(id: string): Promise<FileMedia> {
    const fileMedia = await this.prisma.fileMedia.delete({
      where: {
        id,
      },
    });

    return this.toDomain(fileMedia);
  }

  async softDeleteInLesson(
    fileMediaId: string,
    lessonId: string,
  ): Promise<boolean> {
    const result = await this.prisma.fileMedia.updateMany({
      where: {
        id: fileMediaId,
        lessonId,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    return result.count === 1;
  }

  // Query / Pagination

  async findMany(params?: FindManyFileMediaParams): Promise<FileMedia[]> {
    const fileMediaList = await this.prisma.fileMedia.findMany({
      where: this.buildWhere(params?.where),
      orderBy: this.buildOrderBy(params?.orderBy),
      skip: params?.offset,
      take: this.normalizeLimit(params?.limit),
    });

    return fileMediaList.map((fileMedia) => this.toDomain(fileMedia));
  }

  async count(params?: { where?: FileMediaWhereInput }): Promise<number> {
    return this.prisma.fileMedia.count({
      where: this.buildWhere(params?.where),
    });
  }

  // Lesson-specific helpers

  async findByLessonId(lessonId: string): Promise<FileMedia[]> {
    const fileMediaList = await this.prisma.fileMedia.findMany({
      where: {
        lessonId,
        deletedAt: null,
      },
      orderBy: {
        filename: 'asc',
      },
    });

    return fileMediaList.map((fileMedia) => this.toDomain(fileMedia));
  }

  async existsInLesson(
    fileMediaId: string,
    lessonId: string,
  ): Promise<boolean> {
    const count = await this.prisma.fileMedia.count({
      where: {
        id: fileMediaId,
        lessonId,
        deletedAt: null,
      },
    });

    return count > 0;
  }

  async findByCloudinaryPublicId(
    cloudinaryPublicId: string,
  ): Promise<FileMedia | null> {
    const fileMedia = await this.prisma.fileMedia.findFirst({
      where: {
        cloudinaryPublicId,
        deletedAt: null,
      },
    });

    return fileMedia ? this.toDomain(fileMedia) : null;
  }
}
