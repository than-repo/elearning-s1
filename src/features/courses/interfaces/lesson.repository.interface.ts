//src\features\courses\interfaces\lesson.repository.interface.ts

export interface Lesson {
  id: string;
  sectionId: string;
  title: string;
  description?: string | null;
  lessonIndex: number;
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CreateLessonInput {
  sectionId: string;
  title: string;
  description?: string | null;
  lessonIndex: number;
}

export interface UpdateLessonInput {
  title?: string;
  description?: string | null;
  lessonIndex?: number;
  isActive?: boolean;
  deletedAt?: Date | null;
}

export interface LessonWhereInput {
  id?: string;
  sectionId?: string;
  isActive?: boolean;
  includeDeleted?: boolean;
  titleContains?: string;
}

/** Ordering options */
export type LessonSortField =
  | 'title'
  | 'lessonIndex'
  | 'createdAt'
  | 'updatedAt';

export type SortDirection = 'asc' | 'desc';

export interface LessonOrderByInput {
  field: LessonSortField;
  direction: SortDirection;
}

/** Parameters for findMany / pagination */
export interface FindManyLessonParams {
  where?: LessonWhereInput;
  orderBy?: LessonOrderByInput;
  limit?: number;
  offset?: number;
}

export interface ILessonRepository {
  // Basic CRUD
  create(input: CreateLessonInput): Promise<Lesson>;

  findById(id: string): Promise<Lesson | null>;

  findByIdIncludingDeleted(id: string): Promise<Lesson | null>;

  update(id: string, input: UpdateLessonInput): Promise<Lesson>;

  softDelete(id: string): Promise<Lesson>;

  restore(id: string): Promise<Lesson>;

  changeActive(id: string, isActive: boolean): Promise<Lesson>;

  // Query / pagination
  findMany(params?: FindManyLessonParams): Promise<Lesson[]>;

  count(params?: { where?: LessonWhereInput }): Promise<number>;

  // Section-specific helpers

  findBySectionId(sectionId: string): Promise<Lesson[]>;

  existsInSection(lessonId: string, sectionId: string): Promise<boolean>;

  getNextLessonIndex(sectionId: string): Promise<number>;

  reorderLessons(
    sectionId: string,
    orderedLessonIds: string[],
  ): Promise<Lesson[]>;
}
