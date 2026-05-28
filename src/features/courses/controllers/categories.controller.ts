//src\features\courses\controllers\categories.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from 'src/features/auth/guards/jwt-auth.guard';
import { Roles } from 'src/features/auth/decorators/roles.decorator';
import { UserRole } from 'generated/prisma/enums';
import { RolesGuard } from 'src/features/auth/guards/roles.guard';
import { CreateCategoryDto } from '../dtos/category/create-category.dto';
import { UpdateCategoryDto } from '../dtos/category/update-category.dto';
import { CategoryResponseDto } from '../dtos/category/category-response.dto';
import { SetCategoryActiveStatusDto } from '../dtos/category/set-category-active-status.dto';
import { CategoriesService } from '../services/categories.service';
import { CategoryQueryDto } from '../dtos/category/category-query.dto';
import { PaginatedResponse } from '../dtos/category/paginated-response.dto';

@ApiTags('categories')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller({
  path: 'categories',
  version: '1',
})
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @ApiOperation({ summary: 'Create a Category - Admin api' })
  @ApiOkResponse()
  @ApiBadRequestResponse()
  @ApiForbiddenResponse()
  @Post()
  async createCategory(
    @Body() dto: CreateCategoryDto,
  ): Promise<CategoryResponseDto> {
    return this.categoriesService.createCategory(dto);
  }

  @ApiOperation({ summary: 'Update a Category - Admin api' })
  @ApiOkResponse()
  @ApiBadRequestResponse()
  @ApiForbiddenResponse()
  @Patch(':id')
  async updateCategory(
    @Body() dto: UpdateCategoryDto,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CategoryResponseDto> {
    return this.categoriesService.updateCategory(id, dto);
  }

  @ApiOperation({ summary: 'Change the status of category - Admin api' })
  @ApiOkResponse({ type: CategoryResponseDto })
  @ApiBadRequestResponse()
  @ApiForbiddenResponse()
  @Patch(':id/active-status')
  async setCategoryActiveStatus(
    @Param('id', ParseUUIDPipe) id: string,

    @Body() dto: SetCategoryActiveStatusDto,
  ): Promise<CategoryResponseDto> {
    return this.categoriesService.setCategoryActiveStatus(id, dto.isActive);
  }

  @ApiOperation({ summary: 'Soft delete a Category - Admin api' })
  @ApiOkResponse({ type: CategoryResponseDto })
  @ApiBadRequestResponse()
  @ApiForbiddenResponse()
  @Patch(':id/soft-delete')
  async softDeleteCategory(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CategoryResponseDto> {
    return this.categoriesService.softDeleteCategory(id);
  }

  @ApiOperation({ summary: 'Restore a Category - Admin api' })
  @ApiOkResponse({ type: CategoryResponseDto })
  @ApiBadRequestResponse()
  @ApiForbiddenResponse()
  @Patch(':id/restore')
  async restoreCategory(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CategoryResponseDto> {
    return this.categoriesService.restoreCategory(id);
  }

  @ApiOperation({ summary: 'Find Categories - Admin api' })
  @ApiOkResponse({ type: CategoryResponseDto })
  @ApiBadRequestResponse()
  @ApiForbiddenResponse()
  @Get('')
  async getCategories(
    @Body() dto: CategoryQueryDto,
  ): Promise<PaginatedResponse<CategoryResponseDto>> {
    return this.categoriesService.getCategories(dto);
  }
}
