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
    const fileMedia = await this.prisma.fileMedia.findUnique({
      where: {
        id,
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

  async delete(id: string): Promise<FileMedia> {
    const fileMedia = await this.prisma.fileMedia.delete({
      where: {
        id,
      },
    });

    return this.toDomain(fileMedia);
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
      },
    });

    return count > 0;
  }

  async findByCloudinaryPublicId(
    cloudinaryPublicId: string,
  ): Promise<FileMedia | null> {
    const fileMedia = await this.prisma.fileMedia.findUnique({
      where: {
        cloudinaryPublicId,
      },
    });

    return fileMedia ? this.toDomain(fileMedia) : null;
  }
}
