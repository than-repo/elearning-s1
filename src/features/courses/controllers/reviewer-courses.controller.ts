//src\features\courses\controllers\reviewer-courses.controller.ts
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
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
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
import { PaginatedResponse } from '../dtos/paginated-response.dto';
import {
  AvailableReviewerCourseQueryDto,
  ReviewerCourseQueryDto,
} from '../dtos/course/reviewer-course-query.dto';
import {
  PaginatedAvailableReviewerCourseResponseDto,
  PaginatedReviewerCourseResponseDto,
  ReviewerCourseResponseDto,
} from '../dtos/course/reviewer-course-response.dto';
import {
  ClaimCourseReviewResponseDto,
  ReviewerCourseReviewDecisionResponseDto,
  ReviewerCourseReviewWorkspaceResponseDto,
  SubmitCourseReviewDecisionDto,
} from '../dtos/course/reviewer-course-review.dto';
import { CourseResponseDto } from '../dtos/course/course-response.dto';

@Controller({ path: 'reviewer/courses', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.REVIEWER)
@ApiTags('Reviewer Courses')
@Throttle({ default: { ttl: 60, limit: 60 } })
export class ReviewerCoursesController {
  constructor(
    private readonly reviewerCoursesService: ReviewerCoursesService,
  ) {}
  @Get('available')
  @ApiOperation({
    summary: 'Get unclaimed courses available to claim - Reviewer',
  })
  @ApiOkResponse({ type: PaginatedAvailableReviewerCourseResponseDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async findAvailableCourses(
    @CurrentUser('sub') reviewerId: string,
    @Query() dto: AvailableReviewerCourseQueryDto,
  ): Promise<PaginatedResponse<CourseResponseDto>> {
    return this.reviewerCoursesService.findAvailableCourses(reviewerId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get my claimed pending review tasks - Reviewer' })
  @ApiOkResponse({ type: PaginatedReviewerCourseResponseDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async findReviewableCourses(
    @CurrentUser('sub') reviewerId: string,
    @Query() dto: ReviewerCourseQueryDto,
  ): Promise<PaginatedResponse<ReviewerCourseResponseDto>> {
    return this.reviewerCoursesService.findReviewableCourses(reviewerId, dto);
  }

  @Post(':courseId/claim')
  @ApiOperation({ summary: 'Claim an available course for review - Reviewer' })
  @ApiOkResponse({ type: ClaimCourseReviewResponseDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  async claimCourseForReview(
    @CurrentUser('sub') reviewerId: string,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ): Promise<ClaimCourseReviewResponseDto> {
    return this.reviewerCoursesService.claimCourseForReview(
      reviewerId,
      courseId,
    );
  }

  @Get(':reviewId')
  @ApiOperation({ summary: 'Get full course review workspace - Reviewer' })
  @ApiOkResponse({ type: ReviewerCourseReviewWorkspaceResponseDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async getReviewWorkspace(
    @CurrentUser('sub') reviewerId: string,
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
  ): Promise<ReviewerCourseReviewWorkspaceResponseDto> {
    return this.reviewerCoursesService.getReviewWorkspace(
      reviewerId,
      reviewId,
    );
  }

  @Patch(':reviewId/decision')
  @ApiOperation({ summary: 'Submit course review decision - Reviewer' })
  @ApiOkResponse({ type: ReviewerCourseReviewDecisionResponseDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async submitReviewDecision(
    @CurrentUser('sub') reviewerId: string,
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
    @Body() dto: SubmitCourseReviewDecisionDto,
  ): Promise<ReviewerCourseReviewDecisionResponseDto> {
    return this.reviewerCoursesService.submitReviewDecision(
      reviewerId,
      reviewId,
      dto,
    );
  }
}
