//src\features\courses\controllers\public-courses.controller.ts
import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { LearnerCourseQueryDto } from '../dtos/course/course-query.dto';
import { CoursesService } from '../services/courses.service';
import { PaginatedResponse } from '../dtos/paginated-response.dto';
import { Throttle } from '@nestjs/throttler';
import { CourseResponseDto } from '../dtos/course/course-response.dto';
import { PaginatedCourseResponseDto } from '../dtos/course/paginated-course.dto';
import { CourseSlugParamDto } from '../dtos/course/param-course.dto';

@ApiTags('Course - Public API')
@Controller({ path: 'courses', version: '1' })
@Throttle({ default: { ttl: 60, limit: 60 } })
export class PublicCoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @ApiOperation({ summary: 'Gets courses - Public API' })
  @ApiOkResponse({ type: PaginatedCourseResponseDto })
  @ApiBadRequestResponse()
  @Get()
  async findAllPublic(
    @Query() dto: LearnerCourseQueryDto,
  ): Promise<PaginatedResponse<CourseResponseDto>> {
    return this.coursesService.findAllPublic(dto);
  }

  @ApiOperation({ summary: 'Gets course by slug - Public API' })
  @ApiOkResponse({ type: CourseResponseDto })
  @ApiBadRequestResponse()
  @Get(':slug')
  async findCourseBySlug(
    @Param() param: CourseSlugParamDto,
  ): Promise<CourseResponseDto> {
    return this.coursesService.findCourseBySlug(param.slug);
  }
}
