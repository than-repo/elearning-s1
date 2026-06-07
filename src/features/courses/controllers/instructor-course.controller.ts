//src\features\courses\controllers\instructor-course.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
  ApiNoContentResponse,
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
import { CoursesService } from '../services/courses.service';
import { CreateCourseDto } from '../dtos/course/create-course.dto';
import { CourseResponseDto } from '../dtos/course/course-response.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { UpdateCourseDto } from '../dtos/course/update-course.dto';
import { InstructorCourseQueryDto } from '../dtos/course/query-course.dto';
import { PaginatedResponse } from '../dtos/paginated-response.dto';
import { PaginatedCourseResponseDto } from '../dtos/course/paginated-course.dto';
import { CreateSectionDto } from '../dtos/section-lesson/create-section.dti';
import { SectionResponseDto } from '../dtos/section-lesson/section-response.dto';
import { CourseSectionsService } from '../services/course-sections.service';
import { UpdateSectionDto } from '../dtos/section-lesson/update-section.dto';
import { ReorderSectionsDto } from '../dtos/section-lesson/reorder-sections.dto';
import { QuerySectionsDto } from '../dtos/section-lesson/query-section.dto';
import { LessonResponseDto } from '../dtos/lesson/lesson-response.dto';
import { CreateLessonDto } from '../dtos/lesson/create-lesson.dto';
import { LessonsService } from '../services/lessons.service';
import { UpdateLessonDto } from '../dtos/lesson/update-lesson.dto';
import { QueryLessonsDto } from '../dtos/lesson/query-lessons.dto';
import { ReorderLessonsDto } from '../dtos/lesson/reorder-lesson.dto';

@Controller({ path: 'instructor/courses', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.INSTRUCTOR)
@ApiTags('Instructor Courses')
@Throttle({ default: { ttl: 60, limit: 60 } })
export class InstructorCoursesController {
  constructor(
    private readonly coursesService: CoursesService,
    private readonly courseSectionsService: CourseSectionsService,
    private readonly lessonsService: LessonsService,
  ) {}

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
  @Delete(':id/draft')
  @ApiOperation({ summary: 'Delete own draft course - Instructor' })
  @ApiOkResponse({ type: CourseResponseDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async deleteDraftCourse(
    @CurrentUser('sub') instructorId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) courseId: string,
  ): Promise<{ message: string }> {
    return this.coursesService.deleteDraftCourse(instructorId, courseId);
  }
  //===================section======================

  @Post(':courseId/sections')
  @ApiOperation({ summary: 'Create Section - Instructor' })
  @ApiCreatedResponse({ type: SectionResponseDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async createSection(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @CurrentUser('sub') instructorId: string,
    @Body() dto: CreateSectionDto,
  ): Promise<SectionResponseDto> {
    return this.courseSectionsService.createSection(
      courseId,
      instructorId,
      dto,
    );
  }

  @Get(':courseId/sections')
  @ApiOperation({ summary: 'Get Sections - Instructor' })
  @ApiOkResponse({ type: PaginatedResponse<SectionResponseDto> })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async getSections(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @CurrentUser('sub') instructorId: string,
    @Query() query: QuerySectionsDto,
  ): Promise<PaginatedResponse<SectionResponseDto>> {
    return this.courseSectionsService.getSections(
      courseId,
      instructorId,
      query,
    );
  }

  @Patch(':courseId/sections/reorder')
  @ApiOperation({ summary: 'Reorder Sections - Instructor' })
  @ApiOkResponse({ type: [SectionResponseDto] })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async reorderSections(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @CurrentUser('sub') instructorId: string,
    @Body() dto: ReorderSectionsDto,
  ): Promise<SectionResponseDto[]> {
    return this.courseSectionsService.reorderSections(
      courseId,
      instructorId,
      dto,
    );
  }

  @Patch(':courseId/sections/:sectionId')
  @ApiOperation({ summary: 'Update Section - Instructor' })
  @ApiOkResponse({ type: SectionResponseDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async updateSection(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @CurrentUser('sub') instructorId: string,
    @Body() dto: UpdateSectionDto,
  ): Promise<SectionResponseDto> {
    return this.courseSectionsService.updateSection(
      courseId,
      sectionId,
      instructorId,
      dto,
    );
  }

  @Delete(':courseId/sections/:sectionId')
  @ApiOperation({ summary: 'Delete Section - Instructor' })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async deleteSection(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @CurrentUser('sub') instructorId: string,
  ): Promise<{ Message: string }> {
    return this.courseSectionsService.deleteSection(
      courseId,
      sectionId,
      instructorId,
    );
  }

  //==========================Lesson============================

  @Post(':courseId/sections/:sectionId/lessons')
  @ApiOperation({ summary: 'Create Lesson - Instructor' })
  @ApiCreatedResponse({
    description: 'Lesson created successfully.',
    type: LessonResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid request data.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized.' })
  @ApiForbiddenResponse({
    description: 'You do not have permission to access this course.',
  })
  @ApiNotFoundResponse({ description: 'Course or section not found.' })
  async createLesson(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @CurrentUser('sub') instructorId: string,
    @Body() dto: CreateLessonDto,
  ): Promise<LessonResponseDto> {
    return this.lessonsService.createLesson(
      courseId,
      sectionId,
      instructorId,
      dto,
    );
  }

  @Get(':courseId/sections/:sectionId/lessons')
  @ApiOperation({ summary: 'Get Lessons - Instructor' })
  @ApiOkResponse({
    description: 'Lessons retrieved successfully.',
    type: PaginatedResponse<LessonResponseDto>,
  })
  @ApiBadRequestResponse({ description: 'Invalid query parameters.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized.' })
  @ApiForbiddenResponse({
    description: 'You do not have permission to manage this course.',
  })
  @ApiNotFoundResponse({
    description: 'Course or section not found.',
  })
  async getLessons(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @CurrentUser('sub') instructorId: string,
    @Query() query: QueryLessonsDto,
  ): Promise<PaginatedResponse<LessonResponseDto>> {
    return this.lessonsService.getLessons(
      courseId,
      sectionId,
      instructorId,
      query,
    );
  }

  @Patch(':courseId/sections/:sectionId/lessons/reorder')
  @ApiOperation({ summary: 'Reorder Lessons - Instructor' })
  @ApiOkResponse({
    description: 'Lessons reordered successfully.',
    type: [LessonResponseDto],
  })
  @ApiBadRequestResponse({
    description:
      'Invalid request data or lesson IDs do not match this section.',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized.' })
  @ApiForbiddenResponse({
    description: 'You do not have permission to manage this course.',
  })
  @ApiNotFoundResponse({
    description: 'Course or section not found.',
  })
  async reorderLessons(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @CurrentUser('sub') instructorId: string,
    @Body() dto: ReorderLessonsDto,
  ): Promise<LessonResponseDto[]> {
    return this.lessonsService.reorderLessons(
      courseId,
      sectionId,
      instructorId,
      dto,
    );
  }

  @Patch(':courseId/sections/:sectionId/lessons/:lessonId')
  @ApiOperation({ summary: 'Update Lesson - Instructor' })
  @ApiOkResponse({
    description: 'Lesson updated successfully.',
    type: LessonResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid request data.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized.' })
  @ApiForbiddenResponse({
    description: 'You do not have permission to manage this course.',
  })
  @ApiNotFoundResponse({
    description: 'Course, section, or lesson not found.',
  })
  async updateLesson(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @CurrentUser('sub') instructorId: string,
    @Body() dto: UpdateLessonDto,
  ): Promise<LessonResponseDto> {
    return this.lessonsService.updateLesson(
      courseId,
      sectionId,
      lessonId,
      instructorId,
      dto,
    );
  }

  @Delete(':courseId/sections/:sectionId/lessons/:lessonId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete Lesson - Instructor' })
  @ApiNoContentResponse({
    description: 'Lesson deleted successfully.',
  })
  @ApiBadRequestResponse({ description: 'Invalid request parameters.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized.' })
  @ApiForbiddenResponse({
    description: 'You do not have permission to manage this course.',
  })
  @ApiNotFoundResponse({
    description: 'Course, section, or lesson not found.',
  })
  async deleteLesson(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @CurrentUser('sub') instructorId: string,
  ): Promise<void> {
    await this.lessonsService.deleteLesson(
      courseId,
      sectionId,
      lessonId,
      instructorId,
    );
  }
}
