import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from 'generated/prisma/enums';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/features/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/features/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/features/auth/guards/roles.guard';
import { EnrollmentCourseParamDto } from '../dtos/enrollment-param.dto';
import { MyEnrollmentsQueryDto } from '../dtos/enrollment-query.dto';
import {
  EnrollmentResponseDto,
  EnrollmentStatusResponseDto,
  PaginatedEnrollmentResponseDto,
} from '../dtos/enrollment-response.dto';
import { EnrollmentsService } from '../services/enrollments.service';

@ApiTags('Enrollments - Learner API')
@ApiBearerAuth()
@Controller({ path: 'enrollments', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.LEARNER)
export class LearnerEnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Post('courses/:courseId')
  @Throttle({ default: { ttl: 60, limit: 20 } })
  @ApiOperation({
    summary: 'Enroll current learner in a course with mock successful payment',
  })
  @ApiCreatedResponse({ type: EnrollmentResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing access token' })
  @ApiNotFoundResponse({ description: 'Course is not enrollable' })
  async enrollInCourse(
    @CurrentUser('sub') userId: string,
    @Param() param: EnrollmentCourseParamDto,
  ): Promise<EnrollmentResponseDto> {
    return this.enrollmentsService.enrollInCourse(userId, param.courseId);
  }

  @Get('me')
  @Throttle({ default: { ttl: 60, limit: 60 } })
  @ApiOperation({ summary: 'Get current learner enrollments' })
  @ApiOkResponse({ type: PaginatedEnrollmentResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing access token' })
  async findMyEnrollments(
    @CurrentUser('sub') userId: string,
    @Query() query: MyEnrollmentsQueryDto,
  ): Promise<PaginatedEnrollmentResponseDto> {
    return this.enrollmentsService.findMyEnrollments(userId, query);
  }

  @Get('courses/:courseId/status')
  @Throttle({ default: { ttl: 60, limit: 120 } })
  @ApiOperation({ summary: 'Get current learner enrollment status by course' })
  @ApiOkResponse({ type: EnrollmentStatusResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing access token' })
  async getCourseEnrollmentStatus(
    @CurrentUser('sub') userId: string,
    @Param() param: EnrollmentCourseParamDto,
  ): Promise<EnrollmentStatusResponseDto> {
    return this.enrollmentsService.getCourseEnrollmentStatus(
      userId,
      param.courseId,
    );
  }
}
