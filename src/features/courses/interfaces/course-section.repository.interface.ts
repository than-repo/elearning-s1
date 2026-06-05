//src\features\courses\interfaces\course-section.repository.interface.ts

//Domain entity
export interface CourseSection {
  id: string;
  courseId: string;
  title: string;
  description?: string | null;
  sectionIndex: number;
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface CreateCourseSectionInput {
  courseId: string;
  title: string;
  description?: string | null;
  sectionIndex: number;
}

export interface UpdateCourseSectionInput {
  title?: string;
  description?: string | null;
  sectionIndex?: number;
  isActive?: boolean;
  deletedAt?: Date | null;
}

export interface CourseSectionWhereInput {
  id?: string;
  courseId?: string;
  isActive?: boolean;
  includeDeleted?: boolean;
  titleContains?: string;
}

export type CourseSectionSortField =
  | 'title'
  | 'sectionIndex'
  | 'createdAt'
  | 'updatedAt';

export type SortDirection = 'asc' | 'desc';

export interface CourseSectionOrderByInput {
  field: CourseSectionSortField;
  direction: SortDirection;
}

export interface FindManyCourseSectionParams {
  where?: CourseSectionWhereInput;
  orderBy?: CourseSectionOrderByInput;
  limit?: number;
  offset?: number;
}

export interface ICourseSectionRepository {
  //Basic CRUD
  create(input: CreateCourseSectionInput): Promise<CourseSection>;

  findById(id: string): Promise<CourseSection | null>;

  findByIdIncludingDeleted(id: string): Promise<CourseSection | null>;

  update(id: string, input: UpdateCourseSectionInput): Promise<CourseSection>;

  softDelete(id: string): Promise<void>;

  restore(id: string): Promise<CourseSection>;

  changeActive(id: string, isActive: boolean): Promise<CourseSection>;
  // Query / pagination
  findMany(params?: FindManyCourseSectionParams): Promise<CourseSection[]>;

  count(params?: { where?: CourseSectionWhereInput }): Promise<number>;

  // Course-specific helpers
  findByCourseId(courseId: string): Promise<CourseSection[]>;

  getNextSectionIndex(courseId: string): Promise<number>;

  existsInCourse(sectionId: string, courseId: string): Promise<boolean>;

  //Ordering
  reorderSections(
    courseId: string,
    orderedSectionIds: string[],
  ): Promise<CourseSection[]>;

  shiftSectionsAfterDelete(
    courseId: string,
    deletedSectionIndex: number,
  ): Promise<void>;
}
