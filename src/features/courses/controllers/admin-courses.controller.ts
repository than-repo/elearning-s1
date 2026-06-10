import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UserRole } from 'generated/prisma/enums';
import { Roles } from 'src/features/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/features/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/features/auth/guards/roles.guard';
import { CategoryResponseDto } from '../dtos/category/category-response.dto';
import { CategoryQueryDto } from '../dtos/category/category-query.dto';
import { CreateCategoryDto } from '../dtos/category/create-category.dto';
import { SetCategoryActiveStatusDto } from '../dtos/category/set-category-active-status.dto';
import { UpdateCategoryDto } from '../dtos/category/update-category.dto';
import { PaginatedResponse } from '../dtos/paginated-response.dto';
import {
  ReplaceReviewerCategoryAuthorizationsDto,
  ReviewerCategoryAuthorizationsResponseDto,
} from '../dtos/review-authorization/reviewer-category-authorization.dto';
import { CategoriesService } from '../services/categories.service';
import { CourseReviewAuthorizationService } from '../services/course-review-authorization.service';

@ApiTags('Admin Course Categories')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller({
  path: 'admin/courses',
  version: '1',
})
export class AdminCoursesController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly courseReviewAuthorizationService: CourseReviewAuthorizationService,
  ) {}

  @ApiOperation({ summary: 'Create a Category - Admin api' })
  @ApiOkResponse()
  @ApiBadRequestResponse()
  @ApiForbiddenResponse()
  @Post('categories')
  async createCategory(
    @Body() dto: CreateCategoryDto,
  ): Promise<CategoryResponseDto> {
    return this.categoriesService.createCategory(dto);
  }

  @ApiOperation({ summary: 'Update a Category - Admin api' })
  @ApiOkResponse()
  @ApiBadRequestResponse()
  @ApiForbiddenResponse()
  @Patch('categories/:id')
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
  @Patch('categories/:id/active-status')
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
  @Patch('categories/:id/soft-delete')
  async softDeleteCategory(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CategoryResponseDto> {
    return this.categoriesService.softDeleteCategory(id);
  }

  @ApiOperation({ summary: 'Restore a Category - Admin api' })
  @ApiOkResponse({ type: CategoryResponseDto })
  @ApiBadRequestResponse()
  @ApiForbiddenResponse()
  @Patch('categories/:id/restore')
  async restoreCategory(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CategoryResponseDto> {
    return this.categoriesService.restoreCategory(id);
  }

  @ApiOperation({ summary: 'Get Categories - Admin api' })
  @ApiOkResponse({ type: CategoryResponseDto })
  @ApiBadRequestResponse()
  @ApiForbiddenResponse()
  @Get('categories')
  async getCategories(
    @Query() query: CategoryQueryDto,
  ): Promise<PaginatedResponse<CategoryResponseDto>> {
    return this.categoriesService.getCategories(query);
  }

  @ApiOperation({
    summary:
      'Get the categories that this reviewer is authorized to review - Admin api ',
  })
  @ApiOkResponse({ type: ReviewerCategoryAuthorizationsResponseDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @Get('reviewers/:reviewerId/categories')
  async getReviewerCategoryAuthorizations(
    @Param('reviewerId', ParseUUIDPipe) reviewerId: string,
  ): Promise<ReviewerCategoryAuthorizationsResponseDto> {
    return this.courseReviewAuthorizationService.getReviewerCategoryAuthorizations(
      reviewerId,
    );
  }

  @ApiOperation({
    summary: 'Replace/delete reviewer category authorizations - Admin api',
  })
  @ApiOkResponse({ type: ReviewerCategoryAuthorizationsResponseDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @Put('reviewers/:reviewerId/categories')
  async replaceReviewerCategoryAuthorizations(
    @Param('reviewerId', ParseUUIDPipe) reviewerId: string,
    @Body() dto: ReplaceReviewerCategoryAuthorizationsDto,
  ): Promise<ReviewerCategoryAuthorizationsResponseDto> {
    return this.courseReviewAuthorizationService.replaceReviewerCategoryAuthorizations(
      reviewerId,
      dto,
    );
  }
}
