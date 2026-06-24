import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssessmentAttemptStatus,
  AssessmentStatus,
  EnrollmentStatus,
  ProjectSubmissionStatus,
} from 'generated/prisma/enums';

import type { IAttemptRepository } from '../interfaces/attempt.repository.interface';
import { ATTEMPT_REPOSITORY } from '../repositories/attempt.repository.token';

import {
  LearnerAssessmentDto,
  LearnerAssessmentState,
  LearnerLatestAttemptDto,
} from '../dtos/attempts/learner-assessment.dto';
import { LearnerAssessmentAction } from '../dtos/attempts/learner-assessment.dto';
import {
  CreateAttemptAction,
  CreateAttemptResponseDto,
} from '../dtos/attempts/create-attempt.dto';
import {
  CreateOrResumeAttemptInput,
  GetActiveAttemptInput,
  GetAttemptHistoryInput,
  GetAttemptResultInput,
  GetLearnerCourseAssessmentsInput,
  SaveAttemptAnswerInput,
  SubmitAttemptInput,
  SubmitProjectInput,
} from '../interfaces/learner-assessment-service-input.interface';
import {
  ActiveAttemptDto,
  ActiveAttemptQuestionDto,
  ActiveAttemptSavedAnswerDto,
  ActiveProjectRequirementDto,
} from '../dtos/attempts/active-attempt.dto';
import { AssessmentQuestionType } from '../interfaces/assessment-questions.repository.interface';
import { AssessmentType } from '../interfaces/assessment.repository.interface';
import { SaveAttemptAnswerResponseDto } from '../dtos/attempts/save-attempt-answer.dto';
import {
  AttemptResultAnswerDto,
  AttemptResultDto,
  AttemptResultProjectSubmissionDto,
} from '../dtos/attempts/attempt-result.dto';
import {
  AttemptHistoryDto,
  AttemptHistoryItemDto,
} from '../dtos/attempts/attempt-history.dto';
import { SubmitProjectResponseDto } from '../dtos/attempts/submit-project.dto';
import { LearnerCourseAssessmentsDto } from '../dtos/attempts/learner-course-assessments.dto';

interface GetLearnerAssessmentInput {
  courseId: string;
  assessmentId: string;
  learnerId: string;
}

@Injectable()
export class LearnerAssessmentsService {
  constructor(
    @Inject(ATTEMPT_REPOSITORY)
    private readonly iAttemptRepository: IAttemptRepository,
  ) {}

  async getLearnerCourseAssessments(
    input: GetLearnerCourseAssessmentsInput,
  ): Promise<LearnerCourseAssessmentsDto> {
    const { courseId, learnerId } = input;
    const now = new Date();

    await this.ensureActiveLearnerEnrollment(
      courseId,
      learnerId,
      'You are not allowed to access assessments for this course.',
    );

    const assessments =
      await this.iAttemptRepository.findPublishedAssessmentsForLearnerCourse(
        courseId,
      );

    return {
      assessments: assessments.map((assessment) => ({
        id: assessment.id,
        title: assessment.title,
        description: assessment.description,
        type: assessment.type,

        order: assessment.order,
        totalPoints: assessment.totalPoints,
        passingScore: assessment.passingScore,

        maxAttempts: assessment.maxAttempts,
        timeLimitMinutes: assessment.timeLimitMinutes,

        availableFrom: assessment.availableFrom,
        availableUntil: assessment.availableUntil,
      })),
      serverNow: now,
    };
  }

  private async ensureActiveLearnerEnrollment(
    courseId: string,
    learnerId: string,
    message: string,
  ): Promise<void> {
    const enrollment = await this.iAttemptRepository.findLearnerEnrollment(
      courseId,
      learnerId,
    );

    if (
      !enrollment ||
      !enrollment.isActive ||
      enrollment.deletedAt ||
      enrollment.status !== EnrollmentStatus.ACTIVE
    ) {
      throw new ForbiddenException(message);
    }
  }

  async getLearnerAssessment(
    input: GetLearnerAssessmentInput,
  ): Promise<LearnerAssessmentDto> {
    const { courseId, assessmentId, learnerId } = input;
    const now = new Date();

    const assessment =
      await this.iAttemptRepository.findAssessmentForLearnerEntry(
        courseId,
        assessmentId,
      );

    if (!assessment || assessment.deletedAt || !assessment.isActive) {
      throw new NotFoundException('Assessment not found.');
    }

    const enrollment = await this.iAttemptRepository.findLearnerEnrollment(
      courseId,
      learnerId,
    );

    if (
      !enrollment ||
      !enrollment.isActive ||
      enrollment.deletedAt ||
      enrollment.status !== EnrollmentStatus.ACTIVE
    ) {
      throw new ForbiddenException(
        'You are not allowed to access this assessment.',
      );
    }

    const attempts = await this.iAttemptRepository.findLearnerAttempts(
      assessmentId,
      learnerId,
    );

    const sortedAttempts = [...attempts].sort(
      (a, b) => b.attemptNumber - a.attemptNumber,
    );

    const latestAttempt = sortedAttempts[0] ?? null;

    const activeAttempt =
      sortedAttempts.find(
        (attempt) => attempt.status === AssessmentAttemptStatus.IN_PROGRESS,
      ) ?? null;

    const attemptsUsed = attempts.length;

    const attemptsRemaining = this.computeAttemptsRemaining(
      assessment.maxAttempts,
      attemptsUsed,
    );

    const isPublished = assessment.status === AssessmentStatus.PUBLISHED;

    const isInsideAvailabilityWindow = this.isInsideAvailabilityWindow(
      now,
      assessment.availableFrom,
      assessment.availableUntil,
    );

    const activeAttemptRemainingSeconds = activeAttempt
      ? this.computeRemainingSeconds({
          now,
          startedAt: activeAttempt.startedAt,
          timeLimitMinutes: assessment.timeLimitMinutes,
        })
      : null;

    const activeAttemptExpired =
      activeAttemptRemainingSeconds !== null &&
      activeAttemptRemainingSeconds <= 0;

    const { state, primaryAction, message } = this.computeEntryState({
      isPublished,
      isInsideAvailabilityWindow,
      attemptsRemaining,
      latestAttempt,
      activeAttempt,
      activeAttemptExpired,
    });

    return {
      assessmentId: assessment.id,

      title: assessment.title,
      description: assessment.description,
      type: assessment.type,

      totalPoints: assessment.totalPoints,
      passingScore: assessment.passingScore,

      maxAttempts: assessment.maxAttempts,
      timeLimitMinutes: assessment.timeLimitMinutes,

      availableFrom: assessment.availableFrom,
      availableUntil: assessment.availableUntil,

      attemptsUsed,
      attemptsRemaining,

      state,
      primaryAction,

      latestAttempt: latestAttempt
        ? this.toLatestAttemptDto({
            attempt: latestAttempt,
            remainingSeconds:
              activeAttempt?.id === latestAttempt.id
                ? activeAttemptRemainingSeconds
                : null,
            timeLimitMinutes: assessment.timeLimitMinutes,
            now,
          })
        : null,

      serverNow: now,
      message,
    };
  }

  private computeAttemptsRemaining(
    maxAttempts: number | null,
    attemptsUsed: number,
  ): number | null {
    if (maxAttempts === null) {
      return null;
    }

    return Math.max(maxAttempts - attemptsUsed, 0);
  }

  private isInsideAvailabilityWindow(
    now: Date,
    availableFrom: Date | null,
    availableUntil: Date | null,
  ): boolean {
    if (availableFrom && now < availableFrom) {
      return false;
    }

    if (availableUntil && now > availableUntil) {
      return false;
    }

    return true;
  }

  private computeRemainingSeconds(params: {
    now: Date;
    startedAt: Date;
    timeLimitMinutes: number | null;
  }): number | null {
    const { now, startedAt, timeLimitMinutes } = params;

    if (timeLimitMinutes === null) {
      return null;
    }

    const expiresAtMs = startedAt.getTime() + timeLimitMinutes * 60 * 1000;

    const remainingMs = expiresAtMs - now.getTime();

    return Math.max(Math.floor(remainingMs / 1000), 0);
  }

  private computeExpiresAt(
    startedAt: Date,
    timeLimitMinutes: number | null,
  ): Date | null {
    if (timeLimitMinutes === null) {
      return null;
    }

    return new Date(startedAt.getTime() + timeLimitMinutes * 60 * 1000);
  }

  private computeEntryState(params: {
    isPublished: boolean;
    isInsideAvailabilityWindow: boolean;
    attemptsRemaining: number | null;
    latestAttempt: { status: AssessmentAttemptStatus } | null;
    activeAttempt: { status: AssessmentAttemptStatus } | null;
    activeAttemptExpired: boolean;
  }): {
    state: LearnerAssessmentState;
    primaryAction: LearnerAssessmentAction;
    message: string | null;
  } {
    const {
      isPublished,
      isInsideAvailabilityWindow,
      attemptsRemaining,
      latestAttempt,
      activeAttempt,
      activeAttemptExpired,
    } = params;

    if (!isPublished) {
      return {
        state: LearnerAssessmentState.LOCKED,
        primaryAction: LearnerAssessmentAction.NONE,
        message: 'Assessment is not available.',
      };
    }

    if (!isInsideAvailabilityWindow) {
      return {
        state: LearnerAssessmentState.NOT_AVAILABLE,
        primaryAction: LearnerAssessmentAction.NONE,
        message: 'Assessment is outside the available time window.',
      };
    }

    if (activeAttempt && !activeAttemptExpired) {
      return {
        state: LearnerAssessmentState.CAN_CONTINUE,
        primaryAction: LearnerAssessmentAction.CONTINUE,
        message: null,
      };
    }

    if (attemptsRemaining !== null && attemptsRemaining <= 0) {
      return {
        state: LearnerAssessmentState.MAX_ATTEMPTS_REACHED,
        primaryAction: LearnerAssessmentAction.NONE,
        message: 'Maximum attempt limit reached.',
      };
    }

    if (latestAttempt && this.isFinishedAttemptStatus(latestAttempt.status)) {
      return {
        state: LearnerAssessmentState.COMPLETED,
        primaryAction: LearnerAssessmentAction.VIEW_RESULT,
        message: null,
      };
    }

    return {
      state: LearnerAssessmentState.CAN_START,
      primaryAction: LearnerAssessmentAction.START,
      message: null,
    };
  }

  private toLatestAttemptDto(params: {
    attempt: {
      id: string;
      attemptNumber: number;
      status: AssessmentAttemptStatus;
      score: number | null;
      maxScore: number | null;
      passed: boolean;
      startedAt: Date;
      submittedAt: Date | null;
    };
    remainingSeconds: number | null;
    timeLimitMinutes: number | null;
    now: Date;
  }): LearnerLatestAttemptDto {
    const { attempt, remainingSeconds, timeLimitMinutes } = params;

    return {
      attemptId: attempt.id,
      attemptNumber: attempt.attemptNumber,
      status: attempt.status,

      score: attempt.score,
      maxScore: attempt.maxScore,
      passed: attempt.passed,

      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,

      expiresAt: this.computeExpiresAt(attempt.startedAt, timeLimitMinutes),
      remainingSeconds,
    };
  }
  private isFinishedAttemptStatus(status: AssessmentAttemptStatus): boolean {
    return (
      status === AssessmentAttemptStatus.SUBMITTED ||
      status === AssessmentAttemptStatus.GRADED ||
      status === AssessmentAttemptStatus.PASSED ||
      status === AssessmentAttemptStatus.FAILED
    );
  }

  async createOrResumeAttempt(
    input: CreateOrResumeAttemptInput,
  ): Promise<CreateAttemptResponseDto> {
    const { courseId, assessmentId, learnerId } = input;
    const now = new Date();

    const assessment =
      await this.iAttemptRepository.findAssessmentForLearnerEntry(
        courseId,
        assessmentId,
      );

    if (!assessment || assessment.deletedAt || !assessment.isActive) {
      throw new NotFoundException('Assessment not found.');
    }

    const enrollment = await this.iAttemptRepository.findLearnerEnrollment(
      courseId,
      learnerId,
    );

    if (
      !enrollment ||
      !enrollment.isActive ||
      enrollment.deletedAt ||
      enrollment.status !== EnrollmentStatus.ACTIVE
    ) {
      throw new ForbiddenException(
        'You are not allowed to start this assessment.',
      );
    }

    if (assessment.status !== AssessmentStatus.PUBLISHED) {
      throw new ForbiddenException('Assessment is not published.');
    }

    if (
      !this.isInsideAvailabilityWindow(
        now,
        assessment.availableFrom,
        assessment.availableUntil,
      )
    ) {
      throw new ForbiddenException(
        'Assessment is outside the available time window.',
      );
    }

    let attemptResult =
      await this.iAttemptRepository.createOrResumeAttemptTransaction({
        assessmentId,
        learnerId,
        maxAttempts: assessment.maxAttempts,
        status: AssessmentAttemptStatus.IN_PROGRESS,
        score: null,
        maxScore: null,
        passed: false,
      });

    if (attemptResult.kind === 'MAX_ATTEMPTS_REACHED') {
      throw new ForbiddenException('Maximum attempt limit reached.');
    }

    if (attemptResult.kind === 'RESUMED') {
      const resumedAttempt = attemptResult.attempt;
      const remainingSeconds = this.computeRemainingSeconds({
        now,
        startedAt: resumedAttempt.startedAt,
        timeLimitMinutes: assessment.timeLimitMinutes,
      });

      const isExpired = remainingSeconds !== null && remainingSeconds <= 0;

      if (!isExpired) {
        return {
          action: CreateAttemptAction.RESUMED,

          attemptId: resumedAttempt.id,
          assessmentId: resumedAttempt.assessmentId,
          attemptNumber: resumedAttempt.attemptNumber,

          status: resumedAttempt.status,

          startedAt: resumedAttempt.startedAt,
          expiresAt: this.computeExpiresAt(
            resumedAttempt.startedAt,
            assessment.timeLimitMinutes,
          ),
          remainingSeconds,

          serverNow: now,
        };
      }

      await this.iAttemptRepository.markAttemptFailedDueToExpiry(
        resumedAttempt.id,
      );

      attemptResult =
        await this.iAttemptRepository.createOrResumeAttemptTransaction({
          assessmentId,
          learnerId,
          maxAttempts: assessment.maxAttempts,
          status: AssessmentAttemptStatus.IN_PROGRESS,
          score: null,
          maxScore: null,
          passed: false,
        });

      if (attemptResult.kind === 'MAX_ATTEMPTS_REACHED') {
        throw new ForbiddenException('Maximum attempt limit reached.');
      }
    }

    const attempt = attemptResult.attempt;

    const remainingSeconds = this.computeRemainingSeconds({
      now,
      startedAt: attempt.startedAt,
      timeLimitMinutes: assessment.timeLimitMinutes,
    });

    return {
      action:
        attemptResult.kind === 'CREATED'
          ? CreateAttemptAction.CREATED
          : CreateAttemptAction.RESUMED,

      attemptId: attempt.id,
      assessmentId: attempt.assessmentId,
      attemptNumber: attempt.attemptNumber,

      status: attempt.status,

      startedAt: attempt.startedAt,
      expiresAt: this.computeExpiresAt(
        attempt.startedAt,
        assessment.timeLimitMinutes,
      ),
      remainingSeconds,

      serverNow: now,
    };
  }

  async getActiveAttempt(
    input: GetActiveAttemptInput,
  ): Promise<ActiveAttemptDto> {
    const { courseId, assessmentId, attemptId, learnerId } = input;
    const now = new Date();

    await this.ensureActiveLearnerEnrollment(
      courseId,
      learnerId,
      'You are not allowed to access this attempt.',
    );

    const attempt = await this.iAttemptRepository.findActiveAttemptDetail(
      courseId,
      assessmentId,
      attemptId,
      learnerId,
    );

    if (!attempt) {
      throw new NotFoundException('Attempt not found.');
    }

    if (attempt.learnerId !== learnerId) {
      throw new ForbiddenException(
        'You are not allowed to access this attempt.',
      );
    }

    if (attempt.assessmentId !== assessmentId) {
      throw new BadRequestException(
        'Attempt does not belong to this assessment.',
      );
    }

    const assessment = attempt.assessment;

    if (assessment.courseId !== courseId) {
      throw new BadRequestException(
        'Assessment does not belong to this course.',
      );
    }

    if (
      assessment.status !== AssessmentStatus.PUBLISHED ||
      !assessment.isActive ||
      assessment.deletedAt
    ) {
      throw new ForbiddenException('Assessment is not available.');
    }

    if (
      !this.isInsideAvailabilityWindow(
        now,
        assessment.availableFrom,
        assessment.availableUntil,
      )
    ) {
      throw new ForbiddenException(
        'Assessment is outside the available time window.',
      );
    }

    if (attempt.status !== AssessmentAttemptStatus.IN_PROGRESS) {
      throw new BadRequestException('Attempt is not in progress.');
    }

    await this.assertAttemptOperationAllowedByAvailability({
      attemptId: attempt.id,
      attemptStatus: attempt.status,
      now,
      availableFrom: assessment.availableFrom,
      availableUntil: assessment.availableUntil,
    });

    const remainingSeconds = this.computeRemainingSeconds({
      now,
      startedAt: attempt.startedAt,
      timeLimitMinutes: assessment.timeLimitMinutes,
    });

    const isExpired = remainingSeconds !== null && remainingSeconds <= 0;

    if (isExpired) {
      await this.iAttemptRepository.markAttemptFailedDueToExpiry(attempt.id);

      throw new ForbiddenException('Attempt has expired.');
    }

    const questions =
      assessment.type === AssessmentType.QUIZ
        ? this.buildSafeActiveQuestions(attempt.questions)
        : [];

    const savedAnswers =
      assessment.type === AssessmentType.QUIZ
        ? this.buildSavedAnswers(attempt.savedAnswers)
        : [];

    const projectRequirement =
      assessment.type === AssessmentType.PROJECT
        ? this.buildProjectRequirement({
            assessmentTitle: assessment.title,
            assessmentDescription: assessment.description,
            totalPoints: assessment.totalPoints,
            questions: attempt.questions,
          })
        : null;

    return {
      attemptId: attempt.id,
      assessmentId: attempt.assessmentId,

      assessmentTitle: assessment.title,
      assessmentDescription: assessment.description,

      type: assessment.type,
      status: attempt.status,

      attemptNumber: attempt.attemptNumber,

      totalPoints: assessment.totalPoints,
      passingScore: assessment.passingScore,

      startedAt: attempt.startedAt,

      expiresAt: this.computeExpiresAt(
        attempt.startedAt,
        assessment.timeLimitMinutes,
      ),

      remainingSeconds,
      serverNow: now,

      questions,
      savedAnswers,
      projectRequirement,
    };
  }

  private buildSafeActiveQuestions(
    questions: {
      id: string;
      questionText: string;
      type: AssessmentQuestionType;
      points: number;
      order: number;
      isActive: boolean;
      deletedAt: Date | null;
      answer?: {
        correctOptionAnswer: string | null;
        correctTextAnswer: string | null;
        wrongAnswers: unknown;
      } | null;
    }[],
  ): ActiveAttemptQuestionDto[] {
    return questions
      .filter((question) => question.isActive && !question.deletedAt)
      .sort((a, b) => a.order - b.order)
      .map((question) => ({
        questionId: question.id,
        questionText: question.questionText,
        type: question.type,
        points: question.points,
        order: question.order,
        options: this.buildSafeOptions(question),
      }));
  }
  private buildSafeOptions(question: {
    type: AssessmentQuestionType;
    answer?: {
      correctOptionAnswer: string | null;
      wrongAnswers: unknown;
    } | null;
  }): string[] | null {
    if (question.type === AssessmentQuestionType.TRUE_FALSE) {
      return ['true', 'false'];
    }

    if (question.type !== AssessmentQuestionType.MULTIPLE_CHOICE) {
      return null;
    }

    const correctOption = question.answer?.correctOptionAnswer;

    const wrongAnswers = this.parseWrongAnswers(question.answer?.wrongAnswers);

    const options = [
      ...(correctOption ? [correctOption] : []),
      ...wrongAnswers,
    ];

    /**
     * Safety:
     * Return option strings only.
     * No isCorrect flag.
     * No correctOptionAnswer field name.
     */
    return this.shuffleStrings([...new Set(options)]);
  }
  private parseWrongAnswers(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }
  private shuffleStrings(values: string[]): string[] {
    const result = [...values];

    for (let index = result.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));

      [result[index], result[randomIndex]] = [
        result[randomIndex],
        result[index],
      ];
    }

    return result;
  }
  private buildSavedAnswers(
    savedAnswers: {
      questionId: string;
      textAnswer: string | null;
      createdAt: Date;
      updatedAt: Date;
    }[],
  ): ActiveAttemptSavedAnswerDto[] {
    return savedAnswers.map((answer) => ({
      questionId: answer.questionId,
      answer: answer.textAnswer,
      savedAt: answer.updatedAt ?? answer.createdAt,
    }));
  }

  private buildProjectRequirement(params: {
    assessmentTitle: string;
    assessmentDescription: string | null;
    totalPoints: number;
    questions: {
      questionText: string;
      type: AssessmentQuestionType;
      isActive: boolean;
      deletedAt: Date | null;
      order: number;
    }[];
  }): ActiveProjectRequirementDto {
    const projectQuestion = params.questions
      .filter(
        (question) =>
          question.isActive &&
          !question.deletedAt &&
          question.type === AssessmentQuestionType.PROJECT,
      )
      .sort((a, b) => a.order - b.order)[0];

    return {
      title: params.assessmentTitle,
      description: params.assessmentDescription,
      requirement:
        projectQuestion?.questionText ??
        params.assessmentDescription ??
        'Submit your project according to the assessment requirements.',
      totalPoints: params.totalPoints,
      note: null,
    };
  }

  async saveAttemptAnswer(
    input: SaveAttemptAnswerInput,
  ): Promise<SaveAttemptAnswerResponseDto> {
    const { courseId, assessmentId, attemptId, questionId, learnerId, dto } =
      input;

    const now = new Date();

    await this.ensureActiveLearnerEnrollment(
      courseId,
      learnerId,
      'You are not allowed to update this attempt.',
    );

    const context = await this.iAttemptRepository.findSaveAnswerContext(
      courseId,
      assessmentId,
      attemptId,
      questionId,
      learnerId,
    );

    if (!context) {
      throw new NotFoundException('Attempt or question not found.');
    }

    if (context.learnerId !== learnerId) {
      throw new ForbiddenException(
        'You are not allowed to update this attempt.',
      );
    }

    if (context.assessmentId !== assessmentId) {
      throw new BadRequestException(
        'Attempt does not belong to this assessment.',
      );
    }

    const { assessment, question } = context;

    if (assessment.courseId !== courseId) {
      throw new BadRequestException(
        'Assessment does not belong to this course.',
      );
    }

    if (
      assessment.status !== AssessmentStatus.PUBLISHED ||
      !assessment.isActive ||
      assessment.deletedAt
    ) {
      throw new ForbiddenException('Assessment is not available.');
    }

    if (
      !this.isInsideAvailabilityWindow(
        now,
        assessment.availableFrom,
        assessment.availableUntil,
      )
    ) {
      throw new ForbiddenException(
        'Assessment is outside the available time window.',
      );
    }

    if (assessment.type !== AssessmentType.QUIZ) {
      throw new BadRequestException(
        'Answers can only be saved for quiz assessments.',
      );
    }

    if (context.status !== AssessmentAttemptStatus.IN_PROGRESS) {
      throw new BadRequestException('Attempt is not in progress.');
    }

    await this.assertAttemptOperationAllowedByAvailability({
      attemptId: context.id,
      attemptStatus: context.status,
      now,
      availableFrom: assessment.availableFrom,
      availableUntil: assessment.availableUntil,
    });

    const remainingSeconds = this.computeRemainingSeconds({
      now,
      startedAt: context.startedAt,
      timeLimitMinutes: assessment.timeLimitMinutes,
    });

    const isExpired = remainingSeconds !== null && remainingSeconds <= 0;

    if (isExpired) {
      await this.iAttemptRepository.markAttemptFailedDueToExpiry(context.id);

      throw new ForbiddenException('Attempt has expired.');
    }

    if (!question || !question.isActive || question.deletedAt) {
      throw new NotFoundException('Question not found.');
    }

    if (question.assessmentId !== assessmentId) {
      throw new BadRequestException(
        'Question does not belong to this assessment.',
      );
    }

    const normalizedAnswer = this.normalizeLearnerAnswer(dto.answer);

    this.validateAnswerForQuestionType({
      answer: normalizedAnswer,
      question,
    });

    const savedAnswer = await this.iAttemptRepository.upsertAttemptAnswer({
      attemptId,
      questionId,
      textAnswer: normalizedAnswer,
    });

    if (!savedAnswer) {
      throw new BadRequestException('Attempt is not in progress.');
    }

    return {
      attemptId: savedAnswer.attemptId,
      questionId: savedAnswer.questionId,
      saved: true,
      savedAt: savedAnswer.updatedAt ?? savedAnswer.createdAt,
      remainingSeconds,
      serverNow: now,
    };
  }
  private normalizeLearnerAnswer(answer: string): string {
    const normalized = answer.trim();

    if (!normalized) {
      throw new BadRequestException('Answer is required.');
    }

    return normalized;
  }

  private validateAnswerForQuestionType(params: {
    answer: string;
    question: {
      type: AssessmentQuestionType;
      answer?: {
        correctOptionAnswer: string | null;
        correctTextAnswer: string | null;
        wrongAnswers: unknown;
      } | null;
    };
  }): void {
    const { answer, question } = params;

    switch (question.type) {
      case AssessmentQuestionType.MULTIPLE_CHOICE:
        this.validateMultipleChoiceAnswer(answer, question);
        return;

      case AssessmentQuestionType.TRUE_FALSE:
        this.validateTrueFalseAnswer(answer);
        return;

      case AssessmentQuestionType.FILL_IN_THE_BLANK:
        this.validateFillInBlankAnswer(answer);
        return;

      case AssessmentQuestionType.PROJECT:
        throw new BadRequestException(
          'Project questions must be submitted through project submission.',
        );

      default:
        throw new BadRequestException('Unsupported question type.');
    }
  }
  private validateMultipleChoiceAnswer(
    answer: string,
    question: {
      answer?: {
        correctOptionAnswer: string | null;
        wrongAnswers: unknown;
      } | null;
    },
  ): void {
    const correctOption = question.answer?.correctOptionAnswer;

    const wrongAnswers = this.parseWrongAnswers(question.answer?.wrongAnswers);

    const allowedOptions = [
      ...(correctOption ? [correctOption] : []),
      ...wrongAnswers,
    ];

    if (allowedOptions.length === 0) {
      throw new BadRequestException('Question options are not configured.');
    }

    if (!allowedOptions.includes(answer)) {
      throw new BadRequestException('Invalid selected answer.');
    }
  }

  private validateTrueFalseAnswer(answer: string): void {
    const normalized = answer.toLowerCase();

    if (normalized !== 'true' && normalized !== 'false') {
      throw new BadRequestException('Answer must be true or false.');
    }
  }

  private validateFillInBlankAnswer(answer: string): void {
    if (answer.length > 5000) {
      throw new BadRequestException('Answer is too long.');
    }
  }
  async submitAttempt(input: SubmitAttemptInput): Promise<AttemptResultDto> {
    const { courseId, assessmentId, attemptId, learnerId } = input;
    const now = new Date();

    await this.ensureActiveLearnerEnrollment(
      courseId,
      learnerId,
      'You are not allowed to submit this attempt.',
    );

    const attempt = await this.iAttemptRepository.findQuizAttemptForSubmit(
      courseId,
      assessmentId,
      attemptId,
      learnerId,
    );

    if (!attempt) {
      throw new NotFoundException('Attempt not found.');
    }

    if (attempt.learnerId !== learnerId) {
      throw new ForbiddenException(
        'You are not allowed to submit this attempt.',
      );
    }

    if (attempt.assessmentId !== assessmentId) {
      throw new BadRequestException(
        'Attempt does not belong to this assessment.',
      );
    }

    const assessment = attempt.assessment;

    if (assessment.courseId !== courseId) {
      throw new BadRequestException(
        'Assessment does not belong to this course.',
      );
    }

    if (
      assessment.status !== AssessmentStatus.PUBLISHED ||
      !assessment.isActive ||
      assessment.deletedAt
    ) {
      throw new ForbiddenException('Assessment is not available.');
    }

    if (
      !this.isInsideAvailabilityWindow(
        now,
        assessment.availableFrom,
        assessment.availableUntil,
      )
    ) {
      throw new ForbiddenException(
        'Assessment is outside the available time window.',
      );
    }

    if (assessment.type !== AssessmentType.QUIZ) {
      throw new BadRequestException(
        'Only quiz attempts can be submitted here.',
      );
    }

    if (attempt.status !== AssessmentAttemptStatus.IN_PROGRESS) {
      throw new BadRequestException('Attempt is not in progress.');
    }

    await this.assertAttemptOperationAllowedByAvailability({
      attemptId: attempt.id,
      attemptStatus: attempt.status,
      now,
      availableFrom: assessment.availableFrom,
      availableUntil: assessment.availableUntil,
    });

    const remainingSeconds = this.computeRemainingSeconds({
      now,
      startedAt: attempt.startedAt,
      timeLimitMinutes: assessment.timeLimitMinutes,
    });

    const isExpired = remainingSeconds !== null && remainingSeconds <= 0;

    if (isExpired) {
      await this.iAttemptRepository.markAttemptFailedDueToExpiry(attempt.id);

      throw new ForbiddenException('Attempt has expired.');
    }

    const activeQuestions = attempt.questions
      .filter((question) => question.isActive && !question.deletedAt)
      .sort((a, b) => a.order - b.order);

    if (activeQuestions.length === 0) {
      throw new BadRequestException('Assessment has no active questions.');
    }

    const gradingResult = this.gradeQuizAttempt({
      questions: activeQuestions,
      savedAnswers: attempt.savedAnswers,
      passingScore: assessment.passingScore,
    });

    const finalStatus = gradingResult.passed
      ? AssessmentAttemptStatus.PASSED
      : AssessmentAttemptStatus.FAILED;

    const submittedAttempt =
      await this.iAttemptRepository.submitQuizAttemptTransaction({
        attemptId: attempt.id,
        status: finalStatus,
        score: gradingResult.score,
        maxScore: gradingResult.maxScore,
        passed: gradingResult.passed,
        submittedAt: now,
        gradedAnswers: gradingResult.gradedAnswers,
      });

    if (!submittedAttempt) {
      throw new BadRequestException('Attempt is not in progress.');
    }

    const attemptsUsed = await this.iAttemptRepository.countLearnerAttempts(
      assessmentId,
      learnerId,
    );

    const canRetake = this.computeCanRetake({
      assessmentStatus: assessment.status,
      assessmentIsActive: assessment.isActive,
      assessmentDeletedAt: assessment.deletedAt,
      maxAttempts: assessment.maxAttempts,
      attemptsUsed,
      now,
      availableFrom: assessment.availableFrom,
      availableUntil: assessment.availableUntil,
      hasActiveAttempt: false,
    });

    const canReview = this.computeCanReview({
      attemptStatus: submittedAttempt.status,
      reviewTiming: assessment.reviewTiming,
      now,
      assessmentAvailableUntil: assessment.availableUntil,
    });

    const gradedAnswerByAttemptAnswerId = new Map(
      gradingResult.gradedAnswers.map((answer) => [
        answer.attemptAnswerId,
        answer,
      ]),
    );

    const reviewAnswers = attempt.savedAnswers.map((answer) => {
      const gradedAnswer = gradedAnswerByAttemptAnswerId.get(answer.id);

      return {
        questionId: answer.questionId,
        textAnswer: answer.textAnswer,
        isCorrect: gradedAnswer?.isCorrect ?? null,
        pointsEarned: gradedAnswer?.pointsEarned ?? null,
      };
    });

    const answers = this.buildReviewAnswers({
      canReview,
      reviewContent: assessment.reviewContent,
      questions: activeQuestions,
      answers: reviewAnswers,
    });

    return {
      attemptId: submittedAttempt.id,
      assessmentId: submittedAttempt.assessmentId,

      assessmentTitle: assessment.title,
      assessmentType: assessment.type,

      attemptNumber: submittedAttempt.attemptNumber,
      status: submittedAttempt.status,

      score: submittedAttempt.score,
      maxScore: submittedAttempt.maxScore,
      passed: submittedAttempt.passed,

      startedAt: submittedAttempt.startedAt,
      submittedAt: submittedAttempt.submittedAt,

      canRetake,
      canReview,

      answers,
      projectSubmission: null,

      serverNow: now,
    };
  }

  private gradeQuizAttempt(params: {
    questions: {
      id: string;
      type: AssessmentQuestionType;
      points: number;
      answer: {
        correctOptionAnswer: string | null;
        correctTextAnswer: string | null;
      } | null;
    }[];
    savedAnswers: {
      id: string;
      questionId: string;
      textAnswer: string | null;
    }[];
    passingScore: number | null;
  }): {
    score: number;
    maxScore: number;
    passed: boolean;
    gradedAnswers: {
      attemptAnswerId: string;
      isCorrect: boolean;
      pointsEarned: number;
    }[];
  } {
    const savedAnswerByQuestionId = new Map(
      params.savedAnswers.map((answer) => [answer.questionId, answer]),
    );

    let score = 0;
    let maxScore = 0;

    const gradedAnswers: {
      attemptAnswerId: string;
      isCorrect: boolean;
      pointsEarned: number;
    }[] = [];

    for (const question of params.questions) {
      maxScore += question.points;

      const savedAnswer = savedAnswerByQuestionId.get(question.id);

      if (!savedAnswer) {
        continue;
      }

      const isCorrect = this.isAnswerCorrect({
        questionType: question.type,
        learnerAnswer: savedAnswer.textAnswer,
        correctOptionAnswer: question.answer?.correctOptionAnswer ?? null,
        correctTextAnswer: question.answer?.correctTextAnswer ?? null,
      });

      const pointsEarned = isCorrect ? question.points : 0;

      score += pointsEarned;

      gradedAnswers.push({
        attemptAnswerId: savedAnswer.id,
        isCorrect,
        pointsEarned,
      });
    }

    const passingScore = params.passingScore ?? maxScore;
    const passed = score >= passingScore;

    return {
      score,
      maxScore,
      passed,
      gradedAnswers,
    };
  }

  private isAnswerCorrect(params: {
    questionType: AssessmentQuestionType;
    learnerAnswer: string | null;
    correctOptionAnswer: string | null;
    correctTextAnswer: string | null;
  }): boolean {
    const learnerAnswer = params.learnerAnswer?.trim();

    if (!learnerAnswer) {
      return false;
    }

    switch (params.questionType) {
      case AssessmentQuestionType.MULTIPLE_CHOICE:
      case AssessmentQuestionType.TRUE_FALSE:
        return (
          learnerAnswer.toLowerCase() ===
          params.correctOptionAnswer?.trim().toLowerCase()
        );

      case AssessmentQuestionType.FILL_IN_THE_BLANK:
        return (
          learnerAnswer.toLowerCase() ===
          params.correctTextAnswer?.trim().toLowerCase()
        );

      case AssessmentQuestionType.PROJECT:
        return false;

      default:
        return false;
    }
  }

  private computeCanRetake(params: {
    assessmentStatus: AssessmentStatus;
    assessmentIsActive: boolean;
    assessmentDeletedAt: Date | null;
    maxAttempts: number | null;
    attemptsUsed: number;
    now: Date;
    availableFrom: Date | null;
    availableUntil: Date | null;
    hasActiveAttempt: boolean;
  }): boolean {
    const {
      assessmentStatus,
      assessmentIsActive,
      assessmentDeletedAt,
      maxAttempts,
      attemptsUsed,
      now,
      availableFrom,
      availableUntil,
      hasActiveAttempt,
    } = params;

    const isAssessmentAvailable =
      assessmentStatus === AssessmentStatus.PUBLISHED &&
      assessmentIsActive &&
      !assessmentDeletedAt &&
      this.isInsideAvailabilityWindow(now, availableFrom, availableUntil);

    const hasAttemptsLeft = maxAttempts === null || attemptsUsed < maxAttempts;

    return isAssessmentAvailable && hasAttemptsLeft && !hasActiveAttempt;
  }

  private computeCanReview(params: {
    attemptStatus: AssessmentAttemptStatus;
    reviewTiming: string;
    now: Date;
    assessmentAvailableUntil: Date | null;
  }): boolean {
    const { attemptStatus, reviewTiming, now, assessmentAvailableUntil } =
      params;

    if (!this.isFinishedAttemptStatus(attemptStatus)) {
      return false;
    }

    switch (reviewTiming) {
      case 'NEVER':
        return false;

      case 'AFTER_SUBMIT':
        return true;

      case 'AFTER_GRADED':
        return (
          attemptStatus === AssessmentAttemptStatus.GRADED ||
          attemptStatus === AssessmentAttemptStatus.PASSED ||
          attemptStatus === AssessmentAttemptStatus.FAILED
        );

      case 'AFTER_ASSESSMENT_CLOSED':
        return !!assessmentAvailableUntil && now >= assessmentAvailableUntil;

      case 'MANUAL':
        /**
         * Since you only added reviewTiming and reviewContent,
         * but not reviewAvailableFrom/reviewAvailableUntil,
         * MANUAL cannot be evaluated yet.
         */
        return false;

      default:
        return false;
    }
  }

  async getAttemptHistory(
    input: GetAttemptHistoryInput,
  ): Promise<AttemptHistoryDto> {
    const { courseId, assessmentId, learnerId } = input;
    const now = new Date();

    const assessment =
      await this.iAttemptRepository.findAssessmentForLearnerEntry(
        courseId,
        assessmentId,
      );

    if (!assessment || assessment.deletedAt || !assessment.isActive) {
      throw new NotFoundException('Assessment not found.');
    }

    const enrollment = await this.iAttemptRepository.findLearnerEnrollment(
      courseId,
      learnerId,
    );

    if (
      !enrollment ||
      !enrollment.isActive ||
      enrollment.deletedAt ||
      enrollment.status !== EnrollmentStatus.ACTIVE
    ) {
      throw new ForbiddenException(
        'You are not allowed to view this assessment history.',
      );
    }

    const attempts = await this.iAttemptRepository.findLearnerAttempts(
      assessmentId,
      learnerId,
    );

    const sortedAttempts = [...attempts].sort(
      (a, b) => a.attemptNumber - b.attemptNumber,
    );

    const attemptsUsed = attempts.length;

    const attemptsRemaining = this.computeAttemptsRemaining(
      assessment.maxAttempts,
      attemptsUsed,
    );

    const items: AttemptHistoryItemDto[] = sortedAttempts.map((attempt) => {
      const remainingSeconds = this.computeRemainingSeconds({
        now,
        startedAt: attempt.startedAt,
        timeLimitMinutes: assessment.timeLimitMinutes,
      });

      const isExpired = remainingSeconds !== null && remainingSeconds <= 0;

      const assessmentOpen = this.isInsideAvailabilityWindow(
        now,
        assessment.availableFrom,
        assessment.availableUntil,
      );

      const canContinue =
        assessment.status === AssessmentStatus.PUBLISHED &&
        assessment.isActive &&
        !assessment.deletedAt &&
        assessmentOpen &&
        attempt.status === AssessmentAttemptStatus.IN_PROGRESS &&
        !isExpired;

      const canViewResult = this.isFinishedAttemptStatus(attempt.status);

      return {
        attemptId: attempt.id,

        attemptNumber: attempt.attemptNumber,
        status: attempt.status,

        score: attempt.score,
        maxScore: attempt.maxScore,
        passed: attempt.passed,

        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,

        canContinue,
        canViewResult,
      };
    });

    return {
      assessmentId: assessment.id,
      assessmentTitle: assessment.title,
      assessmentType: assessment.type,

      maxAttempts: assessment.maxAttempts,

      attemptsUsed,
      attemptsRemaining,

      attempts: items,

      serverNow: now,
    };
  }

  async getAttemptResult(
    input: GetAttemptResultInput,
  ): Promise<AttemptResultDto> {
    const { courseId, assessmentId, attemptId, learnerId } = input;
    const now = new Date();

    await this.ensureActiveLearnerEnrollment(
      courseId,
      learnerId,
      'You are not allowed to view this result.',
    );

    const attempt = await this.iAttemptRepository.findAttemptResult(
      courseId,
      assessmentId,
      attemptId,
      learnerId,
    );

    if (!attempt) {
      throw new NotFoundException('Attempt result not found.');
    }

    if (attempt.learnerId !== learnerId) {
      throw new ForbiddenException('You are not allowed to view this result.');
    }

    if (attempt.assessmentId !== assessmentId) {
      throw new BadRequestException(
        'Attempt does not belong to this assessment.',
      );
    }

    const assessment = attempt.assessment;

    if (assessment.courseId !== courseId) {
      throw new BadRequestException(
        'Assessment does not belong to this course.',
      );
    }

    if (!this.isFinishedAttemptStatus(attempt.status)) {
      throw new BadRequestException('Attempt result is not available yet.');
    }

    const attemptsUsed = await this.iAttemptRepository.countLearnerAttempts(
      assessmentId,
      learnerId,
    );

    const activeAttempt = await this.iAttemptRepository.findActiveAttempt(
      assessmentId,
      learnerId,
    );

    const canRetake = this.computeCanRetake({
      assessmentStatus: assessment.status,
      assessmentIsActive: assessment.isActive,
      assessmentDeletedAt: assessment.deletedAt,
      maxAttempts: assessment.maxAttempts,
      attemptsUsed,
      now,
      availableFrom: assessment.availableFrom,
      availableUntil: assessment.availableUntil,
      hasActiveAttempt: !!activeAttempt,
    });

    const canReview = this.computeCanReview({
      attemptStatus: attempt.status,
      reviewTiming: assessment.reviewTiming,
      now,
      assessmentAvailableUntil: assessment.availableUntil,
    });

    const answers = this.buildReviewAnswers({
      canReview,
      reviewContent: assessment.reviewContent,
      questions: attempt.questions,
      answers: attempt.answers,
    });

    const projectSubmission = attempt.projectSubmission
      ? this.toProjectSubmissionResultDto({
          submission: attempt.projectSubmission,
          canReview,
          reviewContent: assessment.reviewContent,
        })
      : null;

    return {
      attemptId: attempt.id,
      assessmentId: attempt.assessmentId,

      assessmentTitle: assessment.title,
      assessmentType: assessment.type,

      attemptNumber: attempt.attemptNumber,
      status: attempt.status,

      score: attempt.score,
      maxScore: attempt.maxScore,
      passed: attempt.passed,

      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,

      canRetake,
      canReview,

      answers,
      projectSubmission,

      serverNow: now,
    };
  }

  private buildReviewAnswers(params: {
    canReview: boolean;
    reviewContent: string;
    questions: {
      id: string;
      questionText: string;
      type: AssessmentQuestionType;
      explanation: string | null;
      points: number;
      order: number;
      answer: {
        correctOptionAnswer: string | null;
        correctTextAnswer: string | null;
      } | null;
    }[];
    answers: {
      questionId: string;
      textAnswer: string | null;
      isCorrect: boolean | null;
      pointsEarned: number | null;
    }[];
  }): AttemptResultAnswerDto[] {
    const { canReview, reviewContent, questions, answers } = params;

    if (!canReview) {
      return [];
    }

    if (reviewContent === 'SCORE_ONLY') {
      return [];
    }

    const answerByQuestionId = new Map(
      answers.map((answer) => [answer.questionId, answer]),
    );

    return [...questions]
      .sort((a, b) => a.order - b.order)
      .map((question) => {
        const learnerAnswer = answerByQuestionId.get(question.id);

        const base: AttemptResultAnswerDto = {
          questionId: question.id,
          questionText: question.questionText,
          questionType: question.type,

          points: question.points,
          pointsEarned: learnerAnswer?.pointsEarned ?? null,

          learnerAnswer: learnerAnswer?.textAnswer ?? null,
          isCorrect: learnerAnswer?.isCorrect ?? null,
        };

        if (reviewContent === 'FULL_REVIEW') {
          return {
            ...base,
            correctAnswer: this.getCorrectAnswerForReview(question),
            explanation: question.explanation,
          };
        }

        /**
         * SCORE_AND_ANSWERS:
         * show learner answer and correctness,
         * but hide correct answer and explanation.
         */
        return base;
      });
  }

  private getCorrectAnswerForReview(question: {
    type: AssessmentQuestionType;
    answer: {
      correctOptionAnswer: string | null;
      correctTextAnswer: string | null;
    } | null;
  }): string | null {
    if (!question.answer) {
      return null;
    }

    switch (question.type) {
      case AssessmentQuestionType.MULTIPLE_CHOICE:
      case AssessmentQuestionType.TRUE_FALSE:
        return question.answer.correctOptionAnswer;

      case AssessmentQuestionType.FILL_IN_THE_BLANK:
        return question.answer.correctTextAnswer;

      case AssessmentQuestionType.PROJECT:
        return null;

      default:
        return null;
    }
  }
  private toProjectSubmissionResultDto(params: {
    submission: {
      id: string;
      status: ProjectSubmissionStatus;

      githubUrl: string | null;
      deployUrl: string | null;
      documentUrl: string | null;
      note: string | null;

      score: number | null;
      feedback: string | null;

      submittedAt: Date;
      gradedAt: Date | null;
    };
    canReview: boolean;
    reviewContent: string;
  }): AttemptResultProjectSubmissionDto {
    const { submission, canReview, reviewContent } = params;

    const canShowScore =
      canReview &&
      (reviewContent === 'SCORE_ONLY' ||
        reviewContent === 'SCORE_AND_ANSWERS' ||
        reviewContent === 'FULL_REVIEW');

    const canShowFeedback = canReview && reviewContent === 'FULL_REVIEW';

    return {
      submissionId: submission.id,

      status: submission.status,

      /**
       * These are learner-owned submission fields.
       * Safe to show as a receipt of what they submitted.
       */
      githubUrl: submission.githubUrl,
      deployUrl: submission.deployUrl,
      documentUrl: submission.documentUrl,
      note: submission.note,

      submittedAt: submission.submittedAt,

      /**
       * Grading fields follow review policy.
       */
      score: canShowScore ? submission.score : null,
      feedback: canShowFeedback ? submission.feedback : null,
      gradedAt: canShowFeedback ? submission.gradedAt : null,
    };
  }

  async submitProject(
    input: SubmitProjectInput,
  ): Promise<SubmitProjectResponseDto> {
    const { courseId, assessmentId, attemptId, learnerId, dto } = input;
    const now = new Date();

    await this.ensureActiveLearnerEnrollment(
      courseId,
      learnerId,
      'You are not allowed to submit this project.',
    );

    const attempt = await this.iAttemptRepository.findProjectAttemptForSubmit(
      courseId,
      assessmentId,
      attemptId,
      learnerId,
    );

    if (!attempt) {
      throw new NotFoundException('Project attempt not found.');
    }

    if (attempt.learnerId !== learnerId) {
      throw new ForbiddenException(
        'You are not allowed to submit this project.',
      );
    }

    if (attempt.assessmentId !== assessmentId) {
      throw new BadRequestException(
        'Attempt does not belong to this assessment.',
      );
    }

    const assessment = attempt.assessment;

    if (assessment.courseId !== courseId) {
      throw new BadRequestException(
        'Assessment does not belong to this course.',
      );
    }

    if (
      assessment.status !== AssessmentStatus.PUBLISHED ||
      !assessment.isActive ||
      assessment.deletedAt
    ) {
      throw new ForbiddenException('Assessment is not available.');
    }

    if (
      !this.isInsideAvailabilityWindow(
        now,
        assessment.availableFrom,
        assessment.availableUntil,
      )
    ) {
      throw new ForbiddenException(
        'Assessment is outside the available time window.',
      );
    }

    if (assessment.type !== AssessmentType.PROJECT) {
      throw new BadRequestException(
        'Only project assessments can be submitted here.',
      );
    }

    if (attempt.status !== AssessmentAttemptStatus.IN_PROGRESS) {
      throw new BadRequestException('Attempt is not in progress.');
    }

    await this.assertAttemptOperationAllowedByAvailability({
      attemptId: attempt.id,
      attemptStatus: attempt.status,
      now,
      availableFrom: assessment.availableFrom,
      availableUntil: assessment.availableUntil,
    });

    await this.assertAttemptOperationAllowedByAvailability({
      attemptId: attempt.id,
      attemptStatus: attempt.status,
      now,
      availableFrom: assessment.availableFrom,
      availableUntil: assessment.availableUntil,
    });

    const remainingSeconds = this.computeRemainingSeconds({
      now,
      startedAt: attempt.startedAt,
      timeLimitMinutes: assessment.timeLimitMinutes,
    });

    const isExpired = remainingSeconds !== null && remainingSeconds <= 0;

    if (isExpired) {
      await this.iAttemptRepository.markAttemptFailedDueToExpiry(attempt.id);

      throw new ForbiddenException('Attempt has expired.');
    }

    if (attempt.projectSubmission) {
      throw new BadRequestException(
        'Project has already been submitted for this attempt.',
      );
    }

    this.validateProjectSubmissionContent(dto);

    const submission = await this.iAttemptRepository.submitProjectTransaction({
      attemptId: attempt.id,
      githubUrl: dto.githubUrl ?? null,
      deployUrl: dto.deployUrl ?? null,
      documentUrl: dto.documentUrl ?? null,
      note: dto.note ?? null,
      submittedAt: now,
    });

    if (!submission) {
      throw new BadRequestException(
        'Attempt is not in progress or project has already been submitted.',
      );
    }

    return {
      submissionId: submission.id,
      attemptId: submission.attemptId,

      status: submission.status,

      githubUrl: submission.githubUrl,
      deployUrl: submission.deployUrl,
      documentUrl: submission.documentUrl,
      note: submission.note,

      submittedAt: submission.submittedAt,

      score: submission.score,
      feedback: submission.feedback,
      gradedAt: submission.gradedAt,

      serverNow: now,
    };
  }

  private validateProjectSubmissionContent(dto: {
    githubUrl?: string;
    deployUrl?: string;
    documentUrl?: string;
    note?: string;
  }): void {
    const hasContent =
      !!dto.githubUrl?.trim() ||
      !!dto.deployUrl?.trim() ||
      !!dto.documentUrl?.trim() ||
      !!dto.note?.trim();

    if (!hasContent) {
      throw new BadRequestException(
        'At least one project submission field is required.',
      );
    }
  }

  private async assertAttemptOperationAllowedByAvailability(params: {
    attemptId: string;
    attemptStatus: AssessmentAttemptStatus;
    now: Date;
    availableFrom: Date | null;
    availableUntil: Date | null;
  }): Promise<void> {
    const { attemptId, attemptStatus, now, availableFrom, availableUntil } =
      params;

    const isOpen = this.isInsideAvailabilityWindow(
      now,
      availableFrom,
      availableUntil,
    );

    if (isOpen) {
      return;
    }

    if (attemptStatus === AssessmentAttemptStatus.IN_PROGRESS) {
      await this.iAttemptRepository.markAttemptFailedDueToExpiry(attemptId);
    }

    throw new ForbiddenException('Assessment availability window is closed.');
  }
}
