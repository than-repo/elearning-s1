import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
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
import { CourseLearningResponseDto } from '../dtos/course-learner-response.dto';
import { LearningCoursesService } from '../services/learning-courses.service';

@Controller({ path: 'learning/courses', version: '1' })
@ApiTags('Learing course API')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.LEARNER)
export class LearnerCoursesController {
  constructor(
    private readonly learningCoursesService: LearningCoursesService,
  ) {}
  @Get(':courseId/detail-learning')
  @Throttle({ default: { ttl: 60, limit: 120 } })
  @ApiOperation({ summary: 'Get current learner enrollment status by course' })
  @ApiOkResponse({ type: CourseLearningResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing access token' })
  async getCourseForLearning(
    @CurrentUser('sub') learnerId: string,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ): Promise<CourseLearningResponseDto> {
    return this.learningCoursesService.getCourseForLearning(
      learnerId,
      courseId,
    );
  }
}
