import { Controller, Get, UseGuards } from '@nestjs/common';
import {
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

@Controller({ path: 'learner/course/:courseId/assessments', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.INSTRUCTOR)
@ApiTags('Assessment - Learner')
@Throttle({ default: { ttl: 60, limit: 5 } })
export class InstructorController {
  constructor() {}

  @ApiOperation({ summary: 'Get detailed assessment' })
  @ApiOkResponse()
  @ApiNotFoundResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @Get()
  async getAssessments() {}
}
