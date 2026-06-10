// src/features/courses/interfaces/file-media.repository.interface.ts

import { MediaTypeEnum } from 'generated/prisma/enums';

/** Core domain entity  */
export interface FileMedia {
  id: string;
  lessonId: string;
  cloudinaryPublicId?: string | null;
  url: string;
  type: MediaTypeEnum;
  filename?: string | null;
  mimeType?: string | null;
  sizeInBytes?: number | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

/** Input for creating a new file media */
export interface CreateFileMediaInput {
  lessonId: string;
  cloudinaryPublicId?: string | null;
  url: string;
  type: MediaTypeEnum;
  filename?: string | null;
  mimeType?: string | null;
  sizeInBytes?: number | null;
}

/** Input for updating an existing file media */
export interface UpdateFileMediaInput {
  cloudinaryPublicId?: string | null;
  url?: string;
  type?: MediaTypeEnum;
  filename?: string | null;
  mimeType?: string | null;
  sizeInBytes?: number | null;
}

/** Flexible where conditions for querying file media */
export interface FileMediaWhereInput {
  id?: string;
  lessonId?: string;
  cloudinaryPublicId?: string | null;
  type?: MediaTypeEnum;
  filenameContains?: string;
  mimeType?: string;
  includeDeleted?: boolean;
}

/** Ordering options */
export type FileMediaSortField =
  | 'filename'
  | 'type'
  | 'sizeInBytes'
  | 'createdAt'
  | 'updatedAt';

export type SortDirection = 'asc' | 'desc';

export interface FileMediaOrderByInput {
  field: FileMediaSortField;
  direction: SortDirection;
}

/** Parameters for findMany */
export interface FindManyFileMediaParams {
  where?: FileMediaWhereInput;
  orderBy?: FileMediaOrderByInput;
  limit?: number;
  offset?: number;
}

export interface IFileMediaRepository {
  // Basic CRUD
  create(input: CreateFileMediaInput): Promise<FileMedia>;

  findById(id: string): Promise<FileMedia | null>;

  findByIdInLesson(
    fileMediaId: string,
    lessonId: string,
  ): Promise<FileMedia | null>;

  update(id: string, input: UpdateFileMediaInput): Promise<FileMedia>;

  updateInLesson(
    fileMediaId: string,
    lessonId: string,
    input: UpdateFileMediaInput,
  ): Promise<FileMedia | null>;

  delete(id: string): Promise<FileMedia>;

  softDeleteInLesson(fileMediaId: string, lessonId: string): Promise<boolean>;

  // Query / pagination
  findMany(params?: FindManyFileMediaParams): Promise<FileMedia[]>;

  count(params?: { where?: FileMediaWhereInput }): Promise<number>;

  // Lesson-specific helpers

  findByLessonId(lessonId: string): Promise<FileMedia[]>;

  existsInLesson(fileMediaId: string, lessonId: string): Promise<boolean>;

  findByCloudinaryPublicId(
    cloudinaryPublicId: string,
  ): Promise<FileMedia | null>;
}
