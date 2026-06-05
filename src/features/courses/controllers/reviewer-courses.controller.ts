//src\features\courses\controllers\reviewer-courses.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
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
import { ReviewerCoursesService } from '../services/reviewer-courses.service';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { PaginatedCourseResponseDto } from '../dtos/course/paginated-course.dto';
import { PaginatedResponse } from '../dtos/paginated-response.dto';
import { CourseResponseDto } from '../dtos/course/course-response.dto';
import { ReviewerCourseQueryDto } from '../dtos/course/reviewer-course-query.dto';

@Controller({ path: 'reviewer/courses', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.REVIEWER)
@ApiTags('Reviewer Courses')
@Throttle({ default: { ttl: 60, limit: 60 } })
export class ReviewerCoursesController {
  constructor(
    private readonly reviewerCoursesService: ReviewerCoursesService,
  ) {}
  @Get()
  @ApiOperation({ summary: 'Get courses available for review - Reviewer' })
  @ApiOkResponse({ type: PaginatedCourseResponseDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async findReviewableCourses(
    @CurrentUser('sub') reviewerId: string,
    @Query() dto: ReviewerCourseQueryDto,
  ): Promise<PaginatedResponse<CourseResponseDto>> {
    return this.reviewerCoursesService.findReviewableCourses(reviewerId, dto);
  }
}
