// src/features/courses/dto/category-response.dto.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';

/**
 * Flat category response – used for:
 * - Admin category list table
 * - findMany, findById, findBySlug, etc.
 */
export class CategoryResponseDto {
  @ApiProperty({ description: 'Category ID' })
  @Expose()
  id!: string;

  @ApiProperty({ description: 'Category name' })
  @Expose()
  name!: string;

  @ApiProperty({ description: 'Unique slug' })
  @Expose()
  slug!: string;

  @ApiPropertyOptional({ description: 'Description (optional)' })
  @Expose()
  description?: string | null;

  @ApiPropertyOptional({ description: 'Parent category ID (null = top level)' })
  @Expose()
  parentId?: string | null;

  @ApiPropertyOptional({
    description: 'Parent name – useful for flat table view',
  })
  @Expose()
  parentName?: string; // ← populated in service/mapper if needed

  @ApiProperty({ description: 'Display order (per parent)' })
  @Expose()
  order!: number;

  @ApiProperty({ description: 'Is category active?' })
  @Expose()
  isActive!: boolean;

  @ApiProperty({ description: 'Created timestamp' })
  @Expose()
  createdAt!: Date;

  @ApiProperty({ description: 'Last updated timestamp' })
  @Expose()
  updatedAt!: Date;

  @ApiPropertyOptional({ description: 'Soft delete timestamp' })
  @Expose()
  deletedAt?: Date | null;

  // Admin-friendly computed fields (very useful in tables)
  @ApiPropertyOptional({ description: 'Number of courses in this category' })
  @Expose()
  courseCount?: number;

  @ApiPropertyOptional({ description: 'Number of direct children' })
  @Expose()
  childrenCount?: number;
}

/**
 * Recursive tree response – used for:
 * - findAllAsTree()
 * - Category selector in "Create Course" form
 * - Drag-and-drop reordering UI
 */

export class CategoryTreeResponseDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  name!: string;

  @ApiProperty()
  @Expose()
  slug!: string;

  @ApiProperty({ nullable: true })
  @Expose()
  description!: string | null;

  @ApiProperty({ nullable: true })
  @Expose()
  parentId!: string | null;

  @ApiProperty()
  @Expose()
  order!: number;

  @ApiProperty({
    type: () => CategoryTreeResponseDto,
    isArray: true,
  })
  @Expose()
  @Type(() => CategoryTreeResponseDto)
  children!: CategoryTreeResponseDto[];
}
