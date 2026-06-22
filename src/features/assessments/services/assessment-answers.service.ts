// src/features/assessments/services/assessment-answers.service.ts

import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import {
  AssessmentQuestionType,
  AssessmentStatus,
} from 'generated/prisma/enums';

import type {
  Assessment,
  IAssessmentRepository,
} from '../interfaces/assessment.repository.interface';
import type {
  AssessmentQuestion,
  IAssessmentQuestionRepository,
} from '../interfaces/assessment-questions.repository.interface';
import type {
  AssessmentAnswer,
  IAssessmentAnswerRepository,
  UpsertAssessmentAnswerInput,
} from '../interfaces/assessment-answers.repository.interface';

import { AssessmentAccessService } from './assessment-access.service';
import { UpsertAssessmentAnswerDto } from '../dtos/answers/assessment-answer.dto';
import { AssessmentAnswerResponseDto } from '../dtos/answers/assessment-answer-response.dto';
import { ASSESSMENT_VIEW_GROUPS } from '../dtos/assessment-response';

import { ASSESSMENT_REPOSITORY } from '../repositories/assessment.repository.token';
import { ASSESSMENT_QUESTIONS_REPOSITORY } from '../repositories/assessment-questions.interface.token';
import { ASSESSMENT_ANSWERS_REPOSITORY } from '../repositories/assessment-answers.repository.token';

type QuestionWithAssessment = {
  question: AssessmentQuestion;
  assessment: Assessment;
};

@Injectable()
export class AssessmentAnswersService {
  constructor(
    @Inject(ASSESSMENT_REPOSITORY)
    private readonly assessmentRepository: IAssessmentRepository,

    @Inject(ASSESSMENT_QUESTIONS_REPOSITORY)
    private readonly assessmentQuestionRepository: IAssessmentQuestionRepository,

    @Inject(ASSESSMENT_ANSWERS_REPOSITORY)
    private readonly assessmentAnswerRepository: IAssessmentAnswerRepository,

    private readonly assessmentAccessService: AssessmentAccessService,
  ) {}

  async upsertAnswerByQuestionId(
    instructorId: string,
    courseId: string,
    assessmentId: string,
    questionId: string,
    dto: UpsertAssessmentAnswerDto,
  ): Promise<AssessmentAnswerResponseDto> {
    const { question, assessment } =
      await this.getQuestionWithAssessmentForInstructor(
        instructorId,
        courseId,
        assessmentId,
        questionId,
      );

    this.ensureAssessmentIsDraft(assessment.status);

    const input = this.buildValidatedAnswerInput(question.type, dto);

    const answer =
      await this.assessmentAnswerRepository.upsertAnswerByQuestionId(
        question.id,
        input,
      );

    return this.toInstructorResponse(answer);
  }

  async getAnswerByQuestionId(
    instructorId: string,
    courseId: string,
    assessmentId: string,
    questionId: string,
  ): Promise<AssessmentAnswerResponseDto> {
    const { question } = await this.getQuestionWithAssessmentForInstructor(
      instructorId,
      courseId,
      assessmentId,
      questionId,
    );

    const answer = await this.assessmentAnswerRepository.findAnswerByQuestionId(
      question.id,
    );

    if (!answer) {
      throw new NotFoundException('Answer not found');
    }

    return this.toInstructorResponse(answer);
  }

  async deleteAnswerByQuestionId(
    instructorId: string,
    courseId: string,
    assessmentId: string,
    questionId: string,
  ): Promise<{ deleted: true }> {
    const { question, assessment } =
      await this.getQuestionWithAssessmentForInstructor(
        instructorId,
        courseId,
        assessmentId,
        questionId,
      );

    this.ensureAssessmentIsDraft(assessment.status);

    const deleted =
      await this.assessmentAnswerRepository.deleteAnswerByQuestionId(
        question.id,
      );

    if (!deleted) {
      throw new NotFoundException('Answer not found');
    }

    return { deleted: true };
  }

  private async getQuestionWithAssessmentForInstructor(
    instructorId: string,
    courseId: string,
    assessmentId: string,
    questionId: string,
  ): Promise<QuestionWithAssessment> {
    await this.assessmentAccessService.ensureInstructorCanManageQuestion(
      instructorId,
      courseId,
      assessmentId,
      questionId,
    );

    const question =
      await this.assessmentQuestionRepository.findQuestionById(questionId);

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    if (question.assessmentId !== assessmentId) {
      throw new NotFoundException('Question not found in assessment');
    }

    const assessment =
      await this.assessmentRepository.findAssessmentById(assessmentId);

    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    if (assessment.courseId !== courseId) {
      throw new NotFoundException('Assessment not found in course');
    }

    return {
      question,
      assessment,
    };
  }

  private ensureAssessmentIsDraft(status: AssessmentStatus): void {
    if (status !== AssessmentStatus.DRAFT) {
      throw new BadRequestException(
        'Answers can only be changed while assessment is in DRAFT status',
      );
    }
  }

  private buildValidatedAnswerInput(
    questionType: AssessmentQuestionType,
    dto: UpsertAssessmentAnswerDto,
  ): UpsertAssessmentAnswerInput {
    switch (questionType) {
      case AssessmentQuestionType.MULTIPLE_CHOICE:
        return this.buildMultipleChoiceAnswerInput(dto);

      case AssessmentQuestionType.TRUE_FALSE:
        return this.buildTrueFalseAnswerInput(dto);

      case AssessmentQuestionType.FILL_IN_THE_BLANK:
        return this.buildFillInTheBlankAnswerInput(dto);

      case AssessmentQuestionType.PROJECT:
        throw new BadRequestException(
          'PROJECT questions do not allow answer keys',
        );

      default:
        throw new BadRequestException('Unsupported question type');
    }
  }

  private buildMultipleChoiceAnswerInput(
    dto: UpsertAssessmentAnswerDto,
  ): UpsertAssessmentAnswerInput {
    const correctOptionAnswer = this.normalizeText(dto.correctOptionAnswer);
    const correctTextAnswer = this.normalizeText(dto.correctTextAnswer);
    const wrongAnswers = this.normalizeStringArray(dto.wrongAnswers);

    if (!correctOptionAnswer) {
      throw new BadRequestException(
        'correctOptionAnswer is required for MULTIPLE_CHOICE questions',
      );
    }

    if (correctTextAnswer) {
      throw new BadRequestException(
        'correctTextAnswer is not allowed for MULTIPLE_CHOICE questions',
      );
    }

    if (!wrongAnswers || wrongAnswers.length === 0) {
      throw new BadRequestException(
        'wrongAnswers is required for MULTIPLE_CHOICE questions',
      );
    }

    this.ensureNoDuplicateOptions(correctOptionAnswer, wrongAnswers);

    return {
      correctOptionAnswer,
      correctTextAnswer: null,
      wrongAnswers,
    };
  }

  private buildTrueFalseAnswerInput(
    dto: UpsertAssessmentAnswerDto,
  ): UpsertAssessmentAnswerInput {
    const correctOptionAnswer = this.normalizeText(dto.correctOptionAnswer);
    const correctTextAnswer = this.normalizeText(dto.correctTextAnswer);
    const wrongAnswers = this.normalizeStringArray(dto.wrongAnswers);

    if (!correctOptionAnswer) {
      throw new BadRequestException(
        'correctOptionAnswer is required for TRUE_FALSE questions',
      );
    }

    const normalizedBooleanAnswer = correctOptionAnswer.toLowerCase();

    if (
      normalizedBooleanAnswer !== 'true' &&
      normalizedBooleanAnswer !== 'false'
    ) {
      throw new BadRequestException(
        'correctOptionAnswer for TRUE_FALSE questions must be "true" or "false"',
      );
    }

    if (correctTextAnswer) {
      throw new BadRequestException(
        'correctTextAnswer is not allowed for TRUE_FALSE questions',
      );
    }

    if (wrongAnswers && wrongAnswers.length > 0) {
      throw new BadRequestException(
        'wrongAnswers should not be provided for TRUE_FALSE questions',
      );
    }

    return {
      correctOptionAnswer: normalizedBooleanAnswer,
      correctTextAnswer: null,
      wrongAnswers: [normalizedBooleanAnswer === 'true' ? 'false' : 'true'],
    };
  }

  private buildFillInTheBlankAnswerInput(
    dto: UpsertAssessmentAnswerDto,
  ): UpsertAssessmentAnswerInput {
    const correctOptionAnswer = this.normalizeText(dto.correctOptionAnswer);
    const correctTextAnswer = this.normalizeText(dto.correctTextAnswer);
    const wrongAnswers = this.normalizeStringArray(dto.wrongAnswers);

    if (!correctTextAnswer) {
      throw new BadRequestException(
        'correctTextAnswer is required for FILL_IN_THE_BLANK questions',
      );
    }

    if (correctOptionAnswer) {
      throw new BadRequestException(
        'correctOptionAnswer is not allowed for FILL_IN_THE_BLANK questions',
      );
    }

    if (wrongAnswers && wrongAnswers.length > 0) {
      throw new BadRequestException(
        'wrongAnswers is not allowed for FILL_IN_THE_BLANK questions',
      );
    }

    return {
      correctOptionAnswer: null,
      correctTextAnswer,
      wrongAnswers: null,
    };
  }

  private ensureNoDuplicateOptions(
    correctOptionAnswer: string,
    wrongAnswers: string[],
  ): void {
    const normalizedCorrect = correctOptionAnswer.toLowerCase();

    const normalizedWrongAnswers = wrongAnswers.map((answer) =>
      answer.toLowerCase(),
    );

    if (normalizedWrongAnswers.includes(normalizedCorrect)) {
      throw new BadRequestException(
        'correctOptionAnswer must not be duplicated in wrongAnswers',
      );
    }

    const uniqueWrongAnswers = new Set(normalizedWrongAnswers);

    if (uniqueWrongAnswers.size !== normalizedWrongAnswers.length) {
      throw new BadRequestException('wrongAnswers must not contain duplicates');
    }
  }

  private normalizeText(value: string | null | undefined): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : null;
  }

  private normalizeStringArray(
    value: string[] | null | undefined,
  ): string[] | null {
    if (!Array.isArray(value)) {
      return null;
    }

    const normalized = value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter((item) => item.length > 0);

    return normalized.length > 0 ? normalized : null;
  }

  private toInstructorResponse(
    answer: AssessmentAnswer,
  ): AssessmentAnswerResponseDto {
    return plainToInstance(AssessmentAnswerResponseDto, answer, {
      excludeExtraneousValues: true,
      groups: [ASSESSMENT_VIEW_GROUPS.INSTRUCTOR],
    });
  }
}
