// src/features/assessments/controllers/learner-assessments.controller.ts

import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from 'generated/prisma/enums';

import { Roles } from 'src/features/auth/decorators/roles.decorator';

import { JwtAuthGuard } from 'src/features/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/features/auth/guards/roles.guard';

import { LearnerAssessmentsService } from '../services/learner-assessments.service';
import { LearnerAssessmentDto } from '../dtos/attempts/learner-assessment.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { CreateAttemptResponseDto } from '../dtos/attempts/create-attempt.dto';
import { ActiveAttemptDto } from '../dtos/attempts/active-attempt.dto';
import {
  SaveAttemptAnswerDto,
  SaveAttemptAnswerResponseDto,
} from '../dtos/attempts/save-attempt-answer.dto';
import { AttemptResultDto } from '../dtos/attempts/attempt-result.dto';
import { AttemptHistoryDto } from '../dtos/attempts/attempt-history.dto';
import {
  SubmitProjectDto,
  SubmitProjectResponseDto,
} from '../dtos/attempts/submit-project.dto';
import { LearnerCourseAssessmentsDto } from '../dtos/attempts/learner-course-assessments.dto';

@Controller({
  path: 'learner/course/:courseId/assessments',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.LEARNER)
@ApiTags('Assessment - Learner')
@ApiBearerAuth()
export class LearnerAssessmentsController {
  constructor(
    private readonly learnerAssessmentsService: LearnerAssessmentsService,
  ) {}

  @Get()
  @Throttle({ default: { ttl: 60, limit: 300 } })
  @ApiOperation({ summary: 'Get learner course assessments' })
  @ApiParam({ name: 'courseId', type: String })
  @ApiOkResponse({ type: LearnerCourseAssessmentsDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async getLearnerCourseAssessments(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @CurrentUser('sub') learnerId: string,
  ): Promise<LearnerCourseAssessmentsDto> {
    return this.learnerAssessmentsService.getLearnerCourseAssessments({
      courseId,
      learnerId,
    });
  }

  /**
   * 1. Entry page
   *
   * FE uses this to decide:
   * - Start assessment
   * - Continue assessment
   * - View result
   * - Locked / not available
   */
  @Get(':assessmentId')
  @Throttle({ default: { ttl: 60, limit: 300 } })
  @ApiOperation({ summary: 'Get learner assessment entry page' })
  @ApiParam({ name: 'courseId', type: String })
  @ApiParam({ name: 'assessmentId', type: String })
  @ApiOkResponse({ type: LearnerAssessmentDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async getLearnerAssessment(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('assessmentId', ParseUUIDPipe) assessmentId: string,
    @CurrentUser('sub') learnerId: string,
  ): Promise<LearnerAssessmentDto> {
    return this.learnerAssessmentsService.getLearnerAssessment({
      courseId,
      assessmentId,
      learnerId,
    });
  }

  /**
   * 2. Create or resume attempt
   *
   * If learner already has IN_PROGRESS attempt:
   * - return existing attempt
   *
   * If not:
   * - backend computes attemptNumber
   * - backend creates new attempt
   */
  @Post(':assessmentId/attempts')
  @Throttle({ default: { ttl: 60, limit: 10 } })
  @ApiOperation({ summary: 'Create or resume learner assessment attempt' })
  @ApiParam({ name: 'courseId', type: String })
  @ApiParam({ name: 'assessmentId', type: String })
  @ApiCreatedResponse({ type: CreateAttemptResponseDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async createOrResumeAttempt(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('assessmentId', ParseUUIDPipe) assessmentId: string,
    @CurrentUser('sub') learnerId: string,
  ): Promise<CreateAttemptResponseDto> {
    return this.learnerAssessmentsService.createOrResumeAttempt({
      courseId,
      assessmentId,
      learnerId,
    });
  }

  /**
   * 3. Active attempt page
   *
   * FE uses this to:
   * - show questions
   * - show timer
   * - restore saved answers
   * - continue unfinished attempt
   *
   * Must not expose correct answers.
   */
  @Get(':assessmentId/attempts/:attemptId')
  @Throttle({ default: { ttl: 60, limit: 60 } })
  @ApiOperation({ summary: 'Get active learner assessment attempt' })
  @ApiParam({ name: 'courseId', type: String })
  @ApiParam({ name: 'assessmentId', type: String })
  @ApiParam({ name: 'attemptId', type: String })
  @ApiOkResponse({ type: ActiveAttemptDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async getActiveAttempt(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('assessmentId', ParseUUIDPipe) assessmentId: string,
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
    @CurrentUser('sub') learnerId: string,
  ): Promise<ActiveAttemptDto> {
    return this.learnerAssessmentsService.getActiveAttempt({
      courseId,
      assessmentId,
      attemptId,
      learnerId,
    });
  }

  /**
   * 4. Autosave one learner answer
   *
   * FE calls this after learner changes an answer.
   *
   * Backend should upsert AssessmentAttemptAnswer using:
   * - attemptId
   * - questionId
   *
   * Must not accept score, isCorrect, pointsEarned, or correct answer from client.
   */
  @Patch(':assessmentId/attempts/:attemptId/answers/:questionId')
  @Throttle({ default: { ttl: 60, limit: 120 } })
  @ApiOperation({ summary: 'Autosave learner answer for active attempt' })
  @ApiParam({ name: 'courseId', type: String })
  @ApiParam({ name: 'assessmentId', type: String })
  @ApiParam({ name: 'attemptId', type: String })
  @ApiParam({ name: 'questionId', type: String })
  @ApiBody({ type: SaveAttemptAnswerDto })
  @ApiOkResponse({ type: SaveAttemptAnswerResponseDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async saveAttemptAnswer(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('assessmentId', ParseUUIDPipe) assessmentId: string,
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @Body() dto: SaveAttemptAnswerDto,
    @CurrentUser('sub') learnerId: string,
  ): Promise<SaveAttemptAnswerResponseDto> {
    return this.learnerAssessmentsService.saveAttemptAnswer({
      courseId,
      assessmentId,
      attemptId,
      questionId,
      learnerId,
      dto,
    });
  }

  /**
   * 5. Submit quiz attempt
   *
   * No request body needed.
   * Backend grades from saved AssessmentAttemptAnswer records.
   */
  @Post(':assessmentId/attempts/:attemptId/submit')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60, limit: 10 } })
  @ApiOperation({ summary: 'Submit learner quiz attempt' })
  @ApiParam({ name: 'courseId', type: String })
  @ApiParam({ name: 'assessmentId', type: String })
  @ApiParam({ name: 'attemptId', type: String })
  @ApiOkResponse({ type: AttemptResultDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async submitAttempt(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('assessmentId', ParseUUIDPipe) assessmentId: string,
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
    @CurrentUser('sub') learnerId: string,
  ): Promise<AttemptResultDto> {
    return this.learnerAssessmentsService.submitAttempt({
      courseId,
      assessmentId,
      attemptId,
      learnerId,
    });
  }

  /**
   * 6. Attempt history
   *
   * Summary list only.
   * Does not return questions, learner answers, or correct answers.
   */
  @Get(':assessmentId/attempts')
  @Throttle({ default: { ttl: 60, limit: 300 } })
  @ApiOperation({ summary: 'Get learner assessment attempt history' })
  @ApiParam({ name: 'courseId', type: String })
  @ApiParam({ name: 'assessmentId', type: String })
  @ApiOkResponse({ type: AttemptHistoryDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async getAttemptHistory(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('assessmentId', ParseUUIDPipe) assessmentId: string,
    @CurrentUser('sub') learnerId: string,
  ): Promise<AttemptHistoryDto> {
    return this.learnerAssessmentsService.getAttemptHistory({
      courseId,
      assessmentId,
      learnerId,
    });
  }

  /**
   * 7. Get attempt result / review
   *
   * Backend decides what learner can review based on:
   * - assessment.reviewTiming
   * - assessment.reviewContent
   * - attempt status
   *
   * FE must not decide whether correct answers are visible.
   */
  @Get(':assessmentId/attempts/:attemptId/result')
  @Throttle({ default: { ttl: 60, limit: 300 } })
  @ApiOperation({ summary: 'Get learner attempt result or review' })
  @ApiParam({ name: 'courseId', type: String })
  @ApiParam({ name: 'assessmentId', type: String })
  @ApiParam({ name: 'attemptId', type: String })
  @ApiOkResponse({ type: AttemptResultDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async getAttemptResult(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('assessmentId', ParseUUIDPipe) assessmentId: string,
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
    @CurrentUser('sub') learnerId: string,
  ): Promise<AttemptResultDto> {
    return this.learnerAssessmentsService.getAttemptResult({
      courseId,
      assessmentId,
      attemptId,
      learnerId,
    });
  }

  /**
   * 8. Submit project
   *
   * Used only for AssessmentType.PROJECT.
   * Learner submits GitHub URL, deploy URL, document URL, or note.
   */
  @Post(':assessmentId/attempts/:attemptId/project-submission')
  @Throttle({ default: { ttl: 60, limit: 10 } })
  @ApiOperation({ summary: 'Submit learner project assessment' })
  @ApiParam({ name: 'courseId', type: String })
  @ApiParam({ name: 'assessmentId', type: String })
  @ApiParam({ name: 'attemptId', type: String })
  @ApiBody({ type: SubmitProjectDto })
  @ApiCreatedResponse({ type: SubmitProjectResponseDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async submitProject(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('assessmentId', ParseUUIDPipe) assessmentId: string,
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
    @Body() dto: SubmitProjectDto,
    @CurrentUser('sub') learnerId: string,
  ): Promise<SubmitProjectResponseDto> {
    return this.learnerAssessmentsService.submitProject({
      courseId,
      assessmentId,
      attemptId,
      learnerId,
      dto,
    });
  }
}
