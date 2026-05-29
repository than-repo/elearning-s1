// src/features/courses/interfaces/category.repository.interface.ts

/** Core domain entity - represents a Category in the business domain */
export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  parentId?: string | null;
  order: number;
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/** Input for creating a new category */
export interface CreateCategoryInput {
  name: string;
  slug: string;
  description?: string | null;
  parentId?: string | null;
  order?: number;
}

/** Input for updating an existing category */
export interface UpdateCategoryInput {
  name?: string;
  slug?: string;
  description?: string | null;
  parentId?: string | null;
  order?: number;
  isActive?: boolean;
  deletedAt?: Date | null;
}

/** Flexible where conditions for querying categories */
export interface CategoryWhereInput {
  id?: string;
  slug?: string;
  parentId?: string | null;
  isActive?: boolean;
  includeDeleted?: boolean;
  nameContains?: string;
}

/** Ordering options */
export type CategorySortField = 'name' | 'order' | 'createdAt' | 'updatedAt';
export type SortDirection = 'asc' | 'desc';
export interface CategoryOrderByInput {
  field: CategorySortField;
  direction: SortDirection;
}

/** Parameters for findMany / pagination */
export interface FindManyCategoryParams {
  where?: CategoryWhereInput;
  orderBy?: CategoryOrderByInput;
  limit?: number;
  offset?: number;
}

/** Result when returning a category with its children (tree) */
export interface CategoryWithChildren extends Category {
  children: CategoryWithChildren[];
}

// ─────────────────────────────────────────────────────────────
// REPOSITORY INTERFACE
// ─────────────────────────────────────────────────────────────

export interface ICategoryRepository {
  /**
   * Return next available order value
   * Return 1 if no siblings exist
   */
  getNextOrder(parentId?: string | null): Promise<number>;

  existsBySlug(slug: string): Promise<boolean>;

  create(input: CreateCategoryInput): Promise<Category>;

  findById(id: string): Promise<Category | null>;

  findByIdIncludingDeleted(id: string): Promise<Category | null>;

  findBySlug(slug: string): Promise<Category | null>;

  findMany(params?: FindManyCategoryParams): Promise<Category[]>;

  /**
   * Returns categories as a hierarchical tree (top-level + children).
   * Used heavily in "Create Course" form.
   */
  findAllAsTree(): Promise<CategoryWithChildren[]>;

  /**
   * Updates an existing category.
   * Throws if category does not exist.
   */
  update(id: string, input: UpdateCategoryInput): Promise<Category>;

  /**
   * Soft deletes a category.
   * Also cascades soft delete to all children (optional business rule).
   * Returns true if successful.
   */
  softDelete(id: string): Promise<Category>;

  /**
   * Checks if a category has any courses attached (used before delete).
   */
  hasAssociatedCourses(id: string): Promise<boolean>;

  count(params?: { where?: CategoryWhereInput }): Promise<number>;
}
