//src\features\courses\controllers\instructor-course.controller.ts
import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from 'generated/prisma/enums';
import { Roles } from 'src/features/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/features/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/features/auth/guards/roles.guard';

@Controller({ path: 'instructor/courses', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.INSTRUCTOR)
@ApiTags('Instructor Courses')
@Throttle({ default: { ttl: 60, limit: 60 } })
export class InstructorCoursesController {}
