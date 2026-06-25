//src\features\courses\controllers\instructor-course.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
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
import { ChangeSectionStatusDto } from '../dtos/section-lesson/change-section-status.dto';
import { ReorderSectionsDto } from '../dtos/section-lesson/reorder-sections.dto';
import { QuerySectionsDto } from '../dtos/section-lesson/query-section.dto';
import { LessonResponseDto } from '../dtos/lesson/lesson-response.dto';
import { CreateLessonDto } from '../dtos/lesson/create-lesson.dto';
import { LessonsService } from '../services/lessons.service';
import { UpdateLessonDto } from '../dtos/lesson/update-lesson.dto';
import { QueryLessonsDto } from '../dtos/lesson/query-lessons.dto';
import { ReorderLessonsDto } from '../dtos/lesson/reorder-lesson.dto';
import { CreateFileMediaDto } from '../dtos/file-media/create-file-media.dto';
import { FileMediaResponseDto } from '../dtos/file-media/file-media-response.dto';
import { QueryFileMediaDto } from '../dtos/file-media/query-file-media.dto';
import { UpdateFileMediaDto } from '../dtos/file-media/update-file-media.dto';
import { FileMediaService } from '../services/file-media.service';
import { InstructorCourseLatestReviewResponseDto } from '../dtos/course/instructor-course-review.dto';

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
    private readonly fileMediaService: FileMediaService,
  ) {}

  //Review information
  @Get(':courseId/reviews/latest')
  @ApiOperation({
    summary: 'Get latest reviewer note for own course - Instructor',
  })
  @ApiOkResponse({ type: InstructorCourseLatestReviewResponseDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async getLatestReviewForCourse(
    @CurrentUser('sub') instructorId: string,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ): Promise<InstructorCourseLatestReviewResponseDto> {
    return this.coursesService.getLatestReviewForInstructorCourse(
      instructorId,
      courseId,
    );
  }

  //======================== Course
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

  @Patch(':id/submit-for-review')
  @ApiOperation({ summary: 'Submit draft course for review - instructor' })
  @ApiOkResponse({ type: CourseResponseDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async submitDraftCourseForReview(
    @CurrentUser('sub') instructorId: string,
    @Param('id', ParseUUIDPipe) courseId: string,
  ): Promise<CourseResponseDto> {
    return this.coursesService.submitDraftCourseForReview(
      instructorId,
      courseId,
    );
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

  @Patch(':courseId/sections/:sectionId/status')
  @ApiOperation({ summary: 'Change Section Active Status - Instructor' })
  @ApiOkResponse({ type: SectionResponseDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async changeSectionActiveStatus(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @CurrentUser('sub') instructorId: string,
    @Body() dto: ChangeSectionStatusDto,
  ): Promise<SectionResponseDto> {
    return this.courseSectionsService.changeSectionActiveStatus(
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

  //==========================File Media============================

  @Post(':courseId/sections/:sectionId/lessons/:lessonId/files')
  @ApiOperation({ summary: 'Create File Media - Instructor' })
  @ApiCreatedResponse({
    description: 'File media created successfully.',
    type: FileMediaResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid request data.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized.' })
  @ApiForbiddenResponse({
    description: 'You do not have permission to manage this course.',
  })
  @ApiNotFoundResponse({
    description: 'Course, section, or lesson not found.',
  })
  async createFileMedia(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @CurrentUser('sub') instructorId: string,
    @Body() dto: CreateFileMediaDto,
  ): Promise<FileMediaResponseDto> {
    return this.fileMediaService.createFileMedia(
      courseId,
      sectionId,
      lessonId,
      instructorId,
      dto,
    );
  }

  @Get(':courseId/sections/:sectionId/lessons/:lessonId/files')
  @ApiOperation({ summary: 'Get File Media List - Instructor' })
  @ApiOkResponse({
    description: 'File media list retrieved successfully.',
    type: PaginatedResponse<FileMediaResponseDto>,
  })
  @ApiBadRequestResponse({ description: 'Invalid query parameters.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized.' })
  @ApiForbiddenResponse({
    description: 'You do not have permission to manage this course.',
  })
  @ApiNotFoundResponse({
    description: 'Course, section, or lesson not found.',
  })
  async getFileMediaList(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @CurrentUser('sub') instructorId: string,
    @Query() query: QueryFileMediaDto,
  ): Promise<PaginatedResponse<FileMediaResponseDto>> {
    return this.fileMediaService.getFileMediaList(
      courseId,
      sectionId,
      lessonId,
      instructorId,
      query,
    );
  }

  @Get(':courseId/sections/:sectionId/lessons/:lessonId/files/:fileMediaId')
  @ApiOperation({ summary: 'Get File Media Detail - Instructor' })
  @ApiOkResponse({
    description: 'File media retrieved successfully.',
    type: FileMediaResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid request parameters.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized.' })
  @ApiForbiddenResponse({
    description: 'You do not have permission to manage this course.',
  })
  @ApiNotFoundResponse({
    description: 'Course, section, lesson, or file media not found.',
  })
  async getFileMedia(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Param('fileMediaId', ParseUUIDPipe) fileMediaId: string,
    @CurrentUser('sub') instructorId: string,
  ): Promise<FileMediaResponseDto> {
    return this.fileMediaService.getFileMedia(
      courseId,
      sectionId,
      lessonId,
      fileMediaId,
      instructorId,
    );
  }

  @Patch(':courseId/sections/:sectionId/lessons/:lessonId/files/:fileMediaId')
  @ApiOperation({ summary: 'Update File Media - Instructor' })
  @ApiOkResponse({
    description: 'File media updated successfully.',
    type: FileMediaResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid request data.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized.' })
  @ApiForbiddenResponse({
    description: 'You do not have permission to manage this course.',
  })
  @ApiNotFoundResponse({
    description: 'Course, section, lesson, or file media not found.',
  })
  async updateFileMedia(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Param('fileMediaId', ParseUUIDPipe) fileMediaId: string,
    @CurrentUser('sub') instructorId: string,
    @Body() dto: UpdateFileMediaDto,
  ): Promise<FileMediaResponseDto> {
    return this.fileMediaService.updateFileMedia(
      courseId,
      sectionId,
      lessonId,
      fileMediaId,
      instructorId,
      dto,
    );
  }

  @Delete(':courseId/sections/:sectionId/lessons/:lessonId/files/:fileMediaId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete File Media - Instructor' })
  @ApiNoContentResponse({
    description: 'File media deleted successfully.',
  })
  @ApiBadRequestResponse({ description: 'Invalid request parameters.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized.' })
  @ApiForbiddenResponse({
    description: 'You do not have permission to manage this course.',
  })
  @ApiNotFoundResponse({
    description: 'Course, section, lesson, or file media not found.',
  })
  async deleteFileMedia(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Param('fileMediaId', ParseUUIDPipe) fileMediaId: string,
    @CurrentUser('sub') instructorId: string,
  ): Promise<void> {
    await this.fileMediaService.deleteFileMedia(
      courseId,
      sectionId,
      lessonId,
      fileMediaId,
      instructorId,
    );
  }
}
