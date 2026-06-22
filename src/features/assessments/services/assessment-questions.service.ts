// src/features/assessments/services/assessment-questions.service.ts

import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

import {
  AssessmentStatus,
  AssessmentType,
  type IAssessmentRepository,
} from '../interfaces/assessment.repository.interface';
import { AssessmentQuestionType } from '../interfaces/assessment-questions.repository.interface';

import type {
  IAssessmentQuestionRepository,
  UpdateAssessmentQuestionInput,
} from '../interfaces/assessment-questions.repository.interface';
import { AssessmentAccessService } from './assessment-access.service';
import {
  CreateAssessmentQuestionDto,
  UpdateAssessmentQuestionDto,
} from '../dtos/questions/assessment-question.dto';
import { AssessmentQuestionResponseDto } from '../dtos/questions/assessment-question-response.dto';
import { ASSESSMENT_VIEW_GROUPS } from '../dtos/assessment-response';
import { ASSESSMENT_REPOSITORY } from '../repositories/assessment.repository.token';
import { ASSESSMENT_QUESTIONS_REPOSITORY } from '../repositories/assessment-questions.interface.token';

const QUIZ_ALLOWED_QUESTION_TYPES: readonly AssessmentQuestionType[] = [
  AssessmentQuestionType.MULTIPLE_CHOICE,
  AssessmentQuestionType.TRUE_FALSE,
  AssessmentQuestionType.FILL_IN_THE_BLANK,
];

@Injectable()
export class AssessmentQuestionsService {
  constructor(
    @Inject(ASSESSMENT_REPOSITORY)
    private readonly iAssessmentRepository: IAssessmentRepository,
    @Inject(ASSESSMENT_QUESTIONS_REPOSITORY)
    private readonly iAssessmentQuestionRepository: IAssessmentQuestionRepository,
    private readonly assessmentAccessService: AssessmentAccessService,
  ) {}

  async createQuestion(
    instructorId: string,
    courseId: string,
    assessmentId: string,
    dto: CreateAssessmentQuestionDto,
  ): Promise<AssessmentQuestionResponseDto> {
    await this.assessmentAccessService.ensureInstructorCanManageAssessment(
      instructorId,
      courseId,
      assessmentId,
    );
    const assessment =
      await this.iAssessmentRepository.findAssessmentById(assessmentId);

    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    this.ensureAssessmentIsDraft(assessment.status);

    this.ensureQuestionTypeAllowedForAssessment(assessment.type, dto.type);

    if (assessment.type === AssessmentType.PROJECT) {
      const activeQuestionCount =
        await this.iAssessmentQuestionRepository.countActiveQuestions(
          assessment.id,
        );

      if (activeQuestionCount > 0) {
        throw new BadRequestException(
          'PROJECT assessment can only have one project question',
        );
      }
    }

    const order = await this.iAssessmentQuestionRepository.getNextOrder(
      assessment.id,
    );

    const question =
      await this.iAssessmentQuestionRepository.createQuestionAndSyncTotalPoints(
        {
          assessmentId: assessment.id,
          questionText: dto.questionText,
          type: dto.type,
          explanation: dto.explanation ?? null,
          points: dto.points ?? 1,
          order,
          isActive: true,
        },
      );

    return this.toInstructorResponse(question);
  }

  async updateQuestion(
    instructorId: string,
    courseId: string,
    assessmentId: string,
    questionId: string,
    dto: UpdateAssessmentQuestionDto,
  ): Promise<AssessmentQuestionResponseDto> {
    await this.assessmentAccessService.ensureInstructorCanManageQuestion(
      instructorId,
      courseId,
      assessmentId,
      questionId,
    );

    const question =
      await this.iAssessmentQuestionRepository.findQuestionById(questionId);

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    const assessment = await this.iAssessmentRepository.findAssessmentById(
      question.assessmentId,
    );

    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    this.ensureAssessmentIsDraft(assessment.status);

    if (dto.type !== undefined && dto.type !== question.type) {
      throw new BadRequestException(
        'Question type cannot be changed after creation. Delete and recreate the question instead.',
      );
    }

    this.ensureQuestionTypeAllowedForAssessment(assessment.type, question.type);

    const updatedQuestion =
      await this.iAssessmentQuestionRepository.updateQuestionAndSyncTotalPoints(
        question.id,
        assessmentId,
        {
          questionText: dto.questionText,
          explanation:
            dto.explanation !== undefined
              ? (dto.explanation ?? null)
              : undefined,
          points: dto.points,
        } satisfies UpdateAssessmentQuestionInput,
      );

    if (!updatedQuestion) {
      throw new NotFoundException('Question not found');
    }

    return this.toInstructorResponse(updatedQuestion);
  }

  async softDeleteQuestion(
    instructorId: string,
    courseId: string,
    assessmentId: string,
    questionId: string,
  ): Promise<{ deleted: true }> {
    await this.assessmentAccessService.ensureInstructorCanManageQuestion(
      instructorId,
      courseId,
      assessmentId,
      questionId,
    );

    const question =
      await this.iAssessmentQuestionRepository.findQuestionById(questionId);

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    const assessment = await this.iAssessmentRepository.findAssessmentById(
      question.assessmentId,
    );

    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }
    this.ensureAssessmentIsDraft(assessment.status);

    const deleted =
      await this.iAssessmentQuestionRepository.softDeleteQuestionAndSyncTotalPoints(
        assessmentId,
        question.id,
      );

    if (!deleted) {
      throw new NotFoundException('Can not delete question. Try again');
    }

    return { deleted: true };
  }

  async getAssessmentQuestions(
    instructorId: string,
    courseId: string,
    assessmentId: string,
    skip = 0,
    take = 50,
  ): Promise<AssessmentQuestionResponseDto[]> {
    await this.assessmentAccessService.ensureInstructorCanManageAssessment(
      instructorId,
      courseId,
      assessmentId,
    );
    const assessment =
      await this.iAssessmentRepository.findAssessmentById(assessmentId);

    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    const questions = await this.iAssessmentQuestionRepository.findMany(
      {
        assessmentId: assessment.id,
        isActive: true,
      },
      {
        field: 'order',
        direction: 'asc',
      },
      skip,
      take,
    );

    return plainToInstance(AssessmentQuestionResponseDto, questions, {
      excludeExtraneousValues: true,
      groups: [ASSESSMENT_VIEW_GROUPS.INSTRUCTOR],
    });
  }

  private ensureAssessmentIsDraft(status: AssessmentStatus): void {
    if (status !== AssessmentStatus.DRAFT) {
      throw new BadRequestException(
        'Questions can only be changed while assessment is in DRAFT status',
      );
    }
  }

  private ensureQuestionTypeAllowedForAssessment(
    assessmentType: AssessmentType,
    questionType: AssessmentQuestionType,
  ): void {
    if (assessmentType === AssessmentType.QUIZ) {
      if (!QUIZ_ALLOWED_QUESTION_TYPES.includes(questionType)) {
        throw new BadRequestException(
          'QUIZ assessment only allows MULTIPLE_CHOICE, TRUE_FALSE, or FILL_IN_THE_BLANK questions',
        );
      }

      return;
    }

    if (assessmentType === AssessmentType.PROJECT) {
      if (questionType !== AssessmentQuestionType.PROJECT) {
        throw new BadRequestException(
          'PROJECT assessment only allows PROJECT question type',
        );
      }

      return;
    }

    throw new BadRequestException('Unsupported assessment type');
  }

  private async syncAssessmentTotalPoints(assessmentId: string): Promise<void> {
    const totalPoints =
      await this.iAssessmentQuestionRepository.sumActiveQuestionPoints(
        assessmentId,
      );

    await this.iAssessmentRepository.updateDraftAssessment(assessmentId, {
      totalPoints,
    });
  }

  private toInstructorResponse(
    question: unknown,
  ): AssessmentQuestionResponseDto {
    return plainToInstance(AssessmentQuestionResponseDto, question, {
      excludeExtraneousValues: true,
      groups: [ASSESSMENT_VIEW_GROUPS.INSTRUCTOR],
    });
  }
}
