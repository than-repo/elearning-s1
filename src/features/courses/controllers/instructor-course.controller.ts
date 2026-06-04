//src\features\courses\controllers\instructor-course.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from 'generated/prisma/enums';
import { Roles } from 'src/features/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/features/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/features/auth/guards/roles.guard';
import { CoursesService } from '../services/courses.service';
import { CreateCourseDto } from '../dtos/course/create-course.dto';
import { CourseResponseDto } from '../dtos/course/course-response.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { UpdateCourseDto } from '../dtos/course/update-course.dto';
import { InstructorCourseQueryDto } from '../dtos/course/query-course.dto';
import { PaginatedResponse } from '../dtos/paginated-response.dto';
import { PaginatedCourseResponseDto } from '../dtos/course/paginated-course.dto';

@Controller({ path: 'instructor/courses', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.INSTRUCTOR)
@ApiTags('Instructor Courses')
@Throttle({ default: { ttl: 60, limit: 60 } })
export class InstructorCoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  @ApiOperation({ summary: 'Get my courses - Instructor' })
  @ApiOkResponse({ type: PaginatedCourseResponseDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async findMyCourses(
    @CurrentUser('sub') instructorId: string,
    @Query() dto: InstructorCourseQueryDto,
  ): Promise<PaginatedResponse<CourseResponseDto>> {
    return this.coursesService.findInstructorCourses(instructorId, dto);
  }

  @Post()
  @ApiOperation({ summary: 'Create draft course - instructor' })
  @ApiCreatedResponse({ type: CourseResponseDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async createDraftCourse(
    @CurrentUser('sub') instructorId: string,
    @Body() dto: CreateCourseDto,
  ): Promise<CourseResponseDto> {
    return this.coursesService.createDraftCourse(instructorId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update draft course - instructor' })
  @ApiOkResponse({ type: CourseResponseDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async updateDraftCourse(
    @CurrentUser('sub') instructorId: string,
    @Param('id', ParseUUIDPipe) courseId: string,
    @Body()
    dto: UpdateCourseDto,
  ): Promise<CourseResponseDto> {
    return this.coursesService.updateDraftCourse(instructorId, courseId, dto);
  }
}
