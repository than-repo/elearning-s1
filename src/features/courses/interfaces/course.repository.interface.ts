//src\features\courses\interfaces\course.repository.interface.ts

import { CourseLevel, CourseStatus } from 'generated/prisma/enums';

// === CORE TYPE ===
export type CourseSortField =
  | 'title'
  | 'price'
  | 'level'
  | 'status'
  | 'createdAt'
  | 'updatedAt'
  | 'publishedAt';

export type SortDirection = 'asc' | 'desc';

export interface CourseCategoryModel {
  id: string;
  name: string;
  slug: string;
}

export interface CourseInstructorModel {
  id: string;
  fullName: string;
}

export interface CourseModel {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  description: string | null;
  whatYouWillLearn: string[] | null;
  requirements: string[] | null;
  thumbnailUrl: string | null;

  cloudinaryPublicId: string | null;

  level: CourseLevel;
  status: CourseStatus;
  price: number | null;
  language: string | null;
  durationInMinutes: number | null;
  isActive: boolean;
  certificateEnabled: boolean;
  publishedAt: Date | null;
  reviewClaimedById?: string | null;
  reviewClaimedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  categories?: CourseCategoryModel[];
  instructors?: CourseInstructorModel[];
}

export interface CreateCourseInput {
  title: string;
  slug: string;
  shortDescription: string;
  description?: string | null;
  whatYouWillLearn?: string[] | null;
  requirements?: string[] | null;
  thumbnailUrl?: string | null;
  cloudinaryPublicId?: string | null;
  level: CourseLevel;
  status?: CourseStatus;
  price?: number | null;
  language?: string | null;
  durationInMinutes?: number | null;
  isActive?: boolean;
  certificateEnabled?: boolean;
  publishedAt?: Date | null;

  categoryIds: string[];
}
export interface CreateDraftCourseInput {
  title: string;
  slug: string;
  shortDescription: string;
  description?: string;
  whatYouWillLearn?: string[];
  requirements?: string[];
  level: CourseLevel;
  price?: number;
  language?: string;
  certificateEnabled?: boolean;
  status: CourseStatus;
  instructorId: string;
  categoryIds: string[];
}
export interface UpdateCourseInput {
  title?: string;
  slug?: string;
  shortDescription?: string;
  description?: string | null;
  whatYouWillLearn?: string[] | null;
  requirements?: string[] | null;
  thumbnailUrl?: string | null;
  cloudinaryPublicId?: string | null;
  level?: CourseLevel;
  status?: CourseStatus;
  price?: number | null;
  language?: string | null;
  certificateEnabled?: boolean;
  publishedAt?: Date | null;
  instructorId?: string;
  categoryIds?: string[];
}

export interface CourseWhereInput {
  search?: string;
  level?: CourseLevel;
  status?: CourseStatus;
  isActive?: boolean;
  certificateEnabled?: boolean;
  categoryId?: string;
  instructorId?: string;
  minPrice?: number;
  maxPrice?: number;
  language?: string;
  publishedFrom?: Date;
  publishedTo?: Date;
}

export interface CourseOrderByInput {
  field: CourseSortField;
  direction: SortDirection;
}

export interface FindManyCourseParams {
  where?: CourseWhereInput;
  orderBy?: CourseOrderByInput;
  limit?: number;
  offset?: number;
}

export interface ICourseRepository {
  create(input: CreateCourseInput): Promise<CourseModel>;

  createDraftCourse(input: CreateDraftCourseInput): Promise<CourseModel>;
  /**
   * deletedAt: null
   */
  findById(id: string): Promise<CourseModel | null>;

  /**
   *  deletedAt: null,
   *  isActive: true
   */
  findActiveById(id: string): Promise<CourseModel | null>;

  findBySlug(slug: string): Promise<CourseModel | null>;

  findMany(params?: FindManyCourseParams): Promise<CourseModel[]>;

  count(where?: CourseWhereInput): Promise<number>;

  update(id: string, input: UpdateCourseInput): Promise<CourseModel>;

  updateDraftCourse(id: string, input: UpdateCourseInput): Promise<CourseModel>;

  submitForReview(id: string): Promise<CourseModel | null>;
  // deletedAt: new Date(),
  // isActive: false
  softDelete(id: string): Promise<CourseModel>;
  //deletedAt: null;
  restore(id: string): Promise<CourseModel>;

  publish(id: string): Promise<CourseModel>;

  unpublish(id: string): Promise<CourseModel>;

  existsOwnedByInstructor(
    courseId: string,
    instructorId: string,
  ): Promise<boolean>;
  existsBySlug(slug: string, excludeId?: string): Promise<boolean>;
}
