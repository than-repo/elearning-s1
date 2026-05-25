import { createHash } from 'node:crypto';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { CoursesService } from '../services/courses.service.js';
import { JwtAuthGuard } from 'src/features/auth/guards/jwt-auth.guard.js';
import { Roles } from 'src/features/auth/decorators/roles.decorator.js';
import { UserRole } from 'generated/prisma/enums.js';
import { RolesGuard } from 'src/features/auth/guards/roles.guard.js';
import { CreateCourseDto } from '../dtos/create-course.dto.js';
import { CreateCategoryDto } from '../dtos/create-category.dto.js';
import type { RequestWithUser } from 'src/common/interfaces/request-with-user.js';
import { UpdateCategoryDto } from '../dtos/update-category.dto.js';

@ApiTags('Courses')
@Controller({
  path: 'courses',
  version: '1',
})
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}
  //Public router
  // @Get('courses')
  // @ApiOperation({ summary: 'Get all courses - Public api' })
  // @ApiOkResponse({ description: 'Get course succuessfuly' })
  // @ApiBadRequestResponse({ description: '' })
  // @Throttle({ default: { ttl: 60, limit: 10 } })
  // async findAll(
  //   @Body() learnerGetCoursesQueryDto: LearnerGetCoursesQueryDto,
  // ): Promise<GetCoursesResponseDto<CourseListItemDto>> {
  //   const courses = await this.coursesService.findManyForLearner(
  //     learnerGetCoursesQueryDto,
  //   );
  //   return courses as GetCoursesResponseDto<CourseListItemDto>;
  // }

  // @Post()
  // @ApiOperation({summary:"Create a course - Instructor api"})
  // @ApiOkResponse()

  //==================== Instructor API====================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Create a course - Intructor api' })
  @ApiOkResponse()
  @ApiBadRequestResponse()
  @ApiForbiddenResponse()
  @Post()
  async create(@Body() createCourseDto: CreateCourseDto) {}

  // //==================== Admin API =======================

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a Category - Admin api' })
  @ApiOkResponse()
  @ApiBadRequestResponse()
  @ApiForbiddenResponse()
  @Post('categories')
  async createCategory(@Body() dto: CreateCategoryDto) {
    this.coursesService.createCategory(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a Category - Admin api' })
  @ApiOkResponse()
  @ApiBadRequestResponse()
  @ApiForbiddenResponse()
  @Patch('categories/:id')
  async updateCategory(
    @Body() dto: UpdateCategoryDto,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    this.coursesService.updateCategory(id, dto);
  }
}
