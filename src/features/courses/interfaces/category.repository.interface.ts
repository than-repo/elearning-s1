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
  description?: string | null;
  parentId?: string | null;
  order?: number;
  isActive?: boolean;
}

/** Flexible where conditions for querying categories */
export interface CategoryWhereInput {
  id?: string;
  slug?: string;
  parentId?: string | null;
  isActive?: boolean;
  nameContains?: string; // for search
}

/** Ordering options */
export type CategoryOrderByInput =
  | 'name_asc'
  | 'name_desc'
  | 'order_asc'
  | 'order_desc'
  | 'createdAt_desc';

/** Parameters for findMany / pagination */
export interface FindManyCategoryParams {
  where?: CategoryWhereInput;
  orderBy?: CategoryOrderByInput;
  limit?: number;
  offset?: number;
  includeChildren?: boolean; // for tree structure
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

  /**
   * Creates a new category.
   * - Auto-generates slug from name
   * - Auto-calculates order if not provided
   * - Validates parentId exists (if provided)
   */
  create(input: CreateCategoryInput): Promise<Category>;

  /**
   * Finds a single category by ID.
   * Returns null if not found or soft-deleted.
   */
  findById(id: string): Promise<Category | null>;

  /**
   * Finds a single category by slug.
   * Returns null if not found or soft-deleted.
   */
  findBySlug(slug: string): Promise<Category | null>;

  /**
   * Returns all categories as a flat list (for admin tables).
   */
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
  softDelete(id: string): Promise<boolean>;

  /**
   * Checks if a slug already exists (used for slug generation uniqueness).
   */
  existsBySlug(slug: string): Promise<boolean>;

  /**
   * Checks if a category has any courses attached (used before delete).
   */
  hasAssociatedCourses(id: string): Promise<boolean>;
}

// This follows strict clean architecture — zero Prisma leakage.
