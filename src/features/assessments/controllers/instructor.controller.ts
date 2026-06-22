import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
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
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from 'generated/prisma/enums';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

import { Roles } from 'src/features/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/features/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/features/auth/guards/roles.guard';
import { CreateAssessmentDto } from '../dtos/assessment/create-assessment.dto';
import { AssessmentsService } from '../services/assessments.service';
import { AssessmentResponseDto } from '../dtos/assessment/assessment-response';
import { UpdateAssessmentDto } from '../dtos/assessment/update-assessment.dto';
import {
  CreateAssessmentQuestionDto,
  UpdateAssessmentQuestionDto,
} from '../dtos/questions/assessment-question.dto';
import { AssessmentQuestionResponseDto } from '../dtos/questions/assessment-question-response.dto';
import { AssessmentQuestionsService } from '../services/assessment-questions.service';
import { AssessmentAnswersService } from '../services/assessment-answers.service';
import { AssessmentAnswerResponseDto } from '../dtos/answers/assessment-answer-response.dto';
import { UpsertAssessmentAnswerDto } from '../dtos/answers/assessment-answer.dto';
import { PaginatedAsessmentResponse } from '../dtos/assessment/pagnated-assessment-response.dto';
import { AssessmentQueryDto } from '../dtos/assessment/query-assessment.dto';
import { DetailedAssessmentDto } from '../dtos/assessment/detailed-assessment.dto';
import { UpdatePublishedAssessmentDto } from '../dtos/assessment/update-published-assessment.dto';

@Controller({ path: 'instructor/course/:courseId/assessments', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.INSTRUCTOR)
@ApiTags('Assessment - Instructor')
@Throttle({ default: { ttl: 60, limit: 5 } })
export class InstructorController {
  constructor(
    private readonly assessmentsService: AssessmentsService,
    private readonly assessmentQuestionsService: AssessmentQuestionsService,
    private readonly assessmentAnswersService: AssessmentAnswersService,
  ) {}

  @ApiOperation({ summary: 'Get detailed assessment' })
  @ApiOkResponse({ type: DetailedAssessmentDto })
  @ApiNotFoundResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @Get(':assessmentId/detail')
  async getDetailedAssessment(
    @CurrentUser('sub') instructorId: string,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('assessmentId', ParseUUIDPipe) assessmentId: string,
  ): Promise<DetailedAssessmentDto> {
    return this.assessmentsService.findDetailedAssessment(
      instructorId,
      courseId,
      assessmentId,
    );
  }

  @ApiOperation({ summary: 'Create Draft Assessment' })
  @ApiCreatedResponse({ type: AssessmentResponseDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @Post('draft')
  async createDraftAssessment(
    @CurrentUser('sub') instructorId: string,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: CreateAssessmentDto,
  ) {
    return this.assessmentsService.createDraftAssessment(
      instructorId,
      courseId,
      dto,
    );
  }

  @ApiOperation({ summary: 'Get Course Assessments' })
  @ApiOkResponse({ type: PaginatedAsessmentResponse<AssessmentResponseDto> })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @Get()
  async findManyAssessments(
    @CurrentUser('sub') instructorId: string,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Query() query: AssessmentQueryDto,
  ): Promise<PaginatedAsessmentResponse<AssessmentResponseDto>> {
    return this.assessmentsService.findMany(instructorId, courseId, query);
  }

  @ApiOperation({ summary: 'Update Draft Assessment' })
  @ApiOkResponse({ type: AssessmentResponseDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @Patch(':assessmentId')
  async updateDraftAssessment(
    @CurrentUser('sub') instructorId: string,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('assessmentId', ParseUUIDPipe) assessmentId: string,
    @Body() dto: UpdateAssessmentDto,
  ): Promise<AssessmentResponseDto> {
    return this.assessmentsService.updateDraftAssessment(
      instructorId,
      courseId,
      assessmentId,
      dto,
    );
  }

  @ApiOperation({ summary: 'Update Publish Assessment' })
  @ApiOkResponse({ type: AssessmentResponseDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @Patch(':assessmentId/published-assessment')
  async updatePublishAssessment(
    @CurrentUser('sub') instructorId: string,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('assessmentId', ParseUUIDPipe) assessmentId: string,
    @Body() dto: UpdatePublishedAssessmentDto,
  ): Promise<AssessmentResponseDto> {
    return this.assessmentsService.updatePublishAssessment(
      instructorId,
      courseId,
      assessmentId,
      dto,
    );
  }

  @ApiOperation({ summary: 'Update Status Assessment into Published' })
  @ApiOkResponse({ type: AssessmentResponseDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @Patch(':assessmentId/publish')
  async publishAssessment(
    @CurrentUser('sub') instructorId: string,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('assessmentId', ParseUUIDPipe) assessmentId: string,
  ): Promise<AssessmentResponseDto> {
    return this.assessmentsService.publishAssessment(
      instructorId,
      courseId,
      assessmentId,
    );
  }

  @ApiOperation({ summary: 'Delete Assessment' })
  @ApiNoContentResponse()
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':assessmentId')
  async deleteAssessment(
    @CurrentUser('sub') instructorId: string,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('assessmentId', ParseUUIDPipe) assessmentId: string,
  ) {
    await this.assessmentsService.deleteAssessment(
      instructorId,
      courseId,
      assessmentId,
    );
  }

  // ---------------------------------------------------------------------------
  // Questions
  // ---------------------------------------------------------------------------

  @ApiOperation({ summary: 'Add Question To Draft Assessment' })
  @ApiCreatedResponse({ type: AssessmentQuestionResponseDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @Post(':assessmentId/questions')
  async createQuestion(
    @CurrentUser('sub') instructorId: string,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('assessmentId', ParseUUIDPipe) assessmentId: string,
    @Body() dto: CreateAssessmentQuestionDto,
  ): Promise<AssessmentQuestionResponseDto> {
    return this.assessmentQuestionsService.createQuestion(
      instructorId,
      courseId,
      assessmentId,
      dto,
    );
  }

  @ApiOperation({ summary: 'Get Assessment Questions' })
  @ApiOkResponse({ type: AssessmentQuestionResponseDto, isArray: true })
  @ApiQuery({
    name: 'skip',
    required: false,
    example: 0,
  })
  @ApiQuery({
    name: 'take',
    required: false,
    example: 50,
  })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @Get(':assessmentId/questions')
  async getAssessmentQuestions(
    @CurrentUser('sub') instructorId: string,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('assessmentId', ParseUUIDPipe) assessmentId: string,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('take', new DefaultValuePipe(50), ParseIntPipe) take: number,
  ): Promise<AssessmentQuestionResponseDto[]> {
    return this.assessmentQuestionsService.getAssessmentQuestions(
      instructorId,
      courseId,
      assessmentId,
      skip,
      take,
    );
  }

  @ApiOperation({ summary: 'Update Draft Assessment Question' })
  @ApiOkResponse({ type: AssessmentQuestionResponseDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @Patch(':assessmentId/questions/:questionId')
  async updateQuestion(
    @CurrentUser('sub') instructorId: string,

    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('assessmentId', ParseUUIDPipe) assessmentId: string,
    @Param('questionId', ParseUUIDPipe) questionId: string,

    @Body() dto: UpdateAssessmentQuestionDto,
  ): Promise<AssessmentQuestionResponseDto> {
    return this.assessmentQuestionsService.updateQuestion(
      instructorId,
      courseId,
      assessmentId,
      questionId,
      dto,
    );
  }

  @ApiOperation({ summary: 'Soft Delete Draft Assessment Question' })
  @ApiOkResponse({
    schema: {
      example: {
        deleted: true,
      },
    },
  })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @Delete(':assessmentId/questions/:questionId')
  @HttpCode(HttpStatus.OK)
  async softDeleteQuestion(
    @CurrentUser('sub') instructorId: string,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('assessmentId', ParseUUIDPipe) assessmentId: string,
    @Param('questionId', ParseUUIDPipe) questionId: string,
  ): Promise<{ deleted: true }> {
    return this.assessmentQuestionsService.softDeleteQuestion(
      instructorId,
      courseId,
      assessmentId,
      questionId,
    );
  }

  // ---------------------------------------------------------------------------
  // Answers
  // ---------------------------------------------------------------------------

  @ApiOperation({ summary: 'Upsert Answer Key For Question' })
  @ApiOkResponse({ type: AssessmentAnswerResponseDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @Patch(':assessmentId/questions/:questionId/answer')
  async upsertAnswerByQuestionId(
    @CurrentUser('sub') instructorId: string,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('assessmentId', ParseUUIDPipe) assessmentId: string,
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @Body() dto: UpsertAssessmentAnswerDto,
  ): Promise<AssessmentAnswerResponseDto> {
    return this.assessmentAnswersService.upsertAnswerByQuestionId(
      instructorId,
      courseId,
      assessmentId,
      questionId,
      dto,
    );
  }

  @ApiOperation({ summary: 'Get Answer Key By Question' })
  @ApiOkResponse({ type: AssessmentAnswerResponseDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @Get(':assessmentId/questions/:questionId/answer')
  async getAnswerByQuestionId(
    @CurrentUser('sub') instructorId: string,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('assessmentId', ParseUUIDPipe) assessmentId: string,
    @Param('questionId', ParseUUIDPipe) questionId: string,
  ): Promise<AssessmentAnswerResponseDto> {
    return this.assessmentAnswersService.getAnswerByQuestionId(
      instructorId,
      courseId,
      assessmentId,
      questionId,
    );
  }

  @ApiOperation({ summary: 'Delete Answer Key By Question' })
  @ApiOkResponse({
    schema: {
      example: {
        deleted: true,
      },
    },
  })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @Delete(':assessmentId/questions/:questionId/answer')
  @HttpCode(HttpStatus.OK)
  async deleteAnswerByQuestionId(
    @CurrentUser('sub') instructorId: string,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('assessmentId', ParseUUIDPipe) assessmentId: string,
    @Param('questionId', ParseUUIDPipe) questionId: string,
  ): Promise<{ deleted: true }> {
    return this.assessmentAnswersService.deleteAnswerByQuestionId(
      instructorId,
      courseId,
      assessmentId,
      questionId,
    );
  }
}
