// src/features/courses/dtos/update-category.dto.ts

import {
  IsOptional,
  IsString,
  IsBoolean,
  IsNumber,
  IsUUID,
  Length,
} from 'class-validator';

export class UpdateCategoryDto {
  /**
   * New name of the category (will trigger slug regeneration in service)
   */
  @IsOptional()
  @IsString()
  @Length(1, 255)
  name?: string;

  /**
   * Description (can be null)
   */
  @IsOptional()
  @IsString()
  description?: string | null;

  /**
   * Change parent category
   * - null = move to root
   * - UUID = move under another category
   */
  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  /**
   * Manual order (usually auto-calculated by service, but exposed for admin flexibility)
   */
  @IsOptional()
  @IsNumber({ allowInfinity: false, allowNaN: false })
  order?: number;

  /**
   * Activate / deactivate category
   */
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
