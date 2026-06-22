import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssessmentStatus,
  AssessmentType,
  OrderAssessmentInput,
  UpdateAssessmentInput,
  WhereAssessmentInput,
  type CreateAssessmentInput,
  type IAssessmentRepository,
} from '../interfaces/assessment.repository.interface';
import { CreateAssessmentDto } from '../dtos/create-assessment.dto';
import { AssessmentAccessService } from './assessment-access.service';
import {
  ASSESSMENT_VIEW_GROUPS,
  AssessmentResponseDto,
} from '../dtos/assessment-response';
import { plainToInstance } from 'class-transformer';
import { UpdateAssessmentDto } from '../dtos/update-assessment.dto';
import {
  ASSESSMENT_QUERY_DEFAULTS,
  AssessmentQueryDto,
} from '../dtos/query-assessment.dto';
import { PaginatedAsessmentResponse } from '../dtos/pagnated-assessment-response.dto';

import { ASSESSMENT_QUESTIONS_REPOSITORY } from '../repositories/assessment-questions.interface.token';
import type { IAssessmentQuestionRepository } from '../interfaces/assessment-questions.repository.interface';
import { ASSESSMENT_REPOSITORY } from '../repositories/assessment.repository.token';
import {
  DetailedAssessmentAnswerDto,
  DetailedAssessmentDto,
} from '../dtos/detailed-assessment.dto';
import { DETAILED_ASSESSMENT_REPOSITORY } from '../repositories/detailed-assessment.repository.token';
import type { IDetailedAssessmentRepository } from '../interfaces/detailed-assessment.interface';
import { promises } from 'dns';

@Injectable()
export class AssessmentsService {
  constructor(
    @Inject(ASSESSMENT_REPOSITORY)
    private readonly iAssessmentRepository: IAssessmentRepository,

    @Inject(ASSESSMENT_QUESTIONS_REPOSITORY)
    private readonly iAssessmentQuestionRepository: IAssessmentQuestionRepository,
    private readonly assessmentAccessService: AssessmentAccessService,

    @Inject(DETAILED_ASSESSMENT_REPOSITORY)
    private readonly iDetailedAssessmentRepository: IDetailedAssessmentRepository,
  ) {}

  async createDraftAssessment(
    instructorId: string,
    courseId: string,
    dto: CreateAssessmentDto,
  ): Promise<AssessmentResponseDto> {
    await this.assessmentAccessService.ensureInstructorCanManageCourse(
      instructorId,
      courseId,
    );
    const order = await this.iAssessmentRepository.getNextOrder(courseId);
    const availableFrom = dto.availableFrom
      ? new Date(dto.availableFrom)
      : undefined;

    const availableUntil = dto.availableUntil
      ? new Date(dto.availableUntil)
      : undefined;

    this.validateAvailabilityWindow(availableFrom, availableUntil);
    const input = {
      courseId,
      title: dto.title,
      description: dto.description,
      type: dto.type,
      status: AssessmentStatus.DRAFT,
      order,

      passingScore: dto.passingScore,
      maxAttempts: dto.maxAttempts,
      timeLimitMinutes:
        dto.type === AssessmentType.QUIZ ? dto.timeLimitMinutes : null,
      availableFrom,
      availableUntil,
      isActive: true,
    } satisfies CreateAssessmentInput;

    const assessment =
      await this.iAssessmentRepository.createDraftAssessment(input);

    return plainToInstance(AssessmentResponseDto, assessment, {
      excludeExtraneousValues: true,
      groups: [ASSESSMENT_VIEW_GROUPS.INSTRUCTOR],
    });
  }
  async updateDraftAssessment(
    instructorId: string,
    courseId: string,
    assessmentId: string,
    dto: UpdateAssessmentDto,
  ) {
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
    if (dto.type && dto.type !== assessment.type) {
      const questionCount =
        await this.iAssessmentQuestionRepository.countActiveQuestions(
          assessment.id,
        );

      if (questionCount > 0) {
        throw new BadRequestException(
          'Assessment type can not be changed after questions are added',
        );
      }
    }
    const availableFrom = dto.availableFrom
      ? new Date(dto.availableFrom)
      : (assessment.availableFrom ?? undefined);

    const availableUntil = dto.availableUntil
      ? new Date(dto.availableUntil)
      : (assessment.availableUntil ?? undefined);

    this.validateAvailabilityWindow(availableFrom, availableUntil);

    const nextType = dto.type ?? assessment.type;

    const input = {
      title: dto.title,
      description: dto.description,
      type: dto.type,

      order: dto.order,

      passingScore: dto.passingScore,

      maxAttempts: dto.maxAttempts,
      timeLimitMinutes:
        nextType === AssessmentType.QUIZ ? dto.timeLimitMinutes : null,

      availableFrom:
        dto.availableFrom !== undefined ? availableFrom : undefined,

      availableUntil:
        dto.availableUntil !== undefined ? availableUntil : undefined,

      isActive: dto.isActive,
    } satisfies UpdateAssessmentInput;

    const updatedAssessment =
      await this.iAssessmentRepository.updateDraftAssessment(
        assessmentId,
        input,
      );

    if (!updatedAssessment) {
      throw new BadRequestException('Can not create assessment. Try again');
    }
    return plainToInstance(AssessmentResponseDto, updatedAssessment, {
      excludeExtraneousValues: true,
      groups: [ASSESSMENT_VIEW_GROUPS.INSTRUCTOR],
    });
  }
  async deleteAssessment(
    instructorId: string,
    courseId: string,
    assessmentId: string,
  ): Promise<{ deleted: true }> {
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

    const softdeleted =
      await this.iAssessmentRepository.softDeleteAssessment(assessmentId);
    if (!softdeleted) {
      throw new BadRequestException('Can not delete assessment. Try again');
    }
    return { deleted: true };
  }
  async findMany(
    instructorId: string,
    courseId: string,
    query: AssessmentQueryDto,
  ): Promise<PaginatedAsessmentResponse<AssessmentResponseDto>> {
    await this.assessmentAccessService.ensureInstructorCanManageCourse(
      instructorId,
      courseId,
    );

    const where = {
      ...this.buildWhereInput(query),
      courseId,
      includeDeleted: false,
    };

    const orderBy = this.buildOrderInput(query);
    const { skip, take, page, limit } = this.getPagination(query);

    const [assessments, total] = await Promise.all([
      this.iAssessmentRepository.findMany(where, orderBy, skip, take),
      this.iAssessmentRepository.count(where),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: assessments.map((assessment) =>
        plainToInstance(AssessmentResponseDto, assessment, {
          excludeExtraneousValues: true,
          groups: [ASSESSMENT_VIEW_GROUPS.INSTRUCTOR],
        }),
      ),
      meta: {
        limit,
        total,
        page,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }
  async findDetailedAssessment(
    instructorId: string,
    courseId: string,
    assessmentId: string,
  ): Promise<DetailedAssessmentDto> {
    await this.assessmentAccessService.ensureInstructorCanManageAssessment(
      instructorId,
      courseId,
      assessmentId,
    );

    const detailedAssessment =
      await this.iDetailedAssessmentRepository.findDetailedAssessment(
        assessmentId,
      );

    if (!detailedAssessment) {
      throw new NotFoundException('Detailed assessment not found');
    }

    return plainToInstance(DetailedAssessmentDto, detailedAssessment, {
      excludeExtraneousValues: true,
      enableImplicitConversion: true,
    });
  }

  private buildWhereInput(query: AssessmentQueryDto): WhereAssessmentInput {
    return {
      id: query.id,
      ids: query.ids,

      courseId: query.courseId,

      type: query.type,
      types: query.types,

      status: query.status,
      statuses: query.statuses,

      isActive: query.isActive,
      includeDeleted: query.includeDeleted ?? false,

      search: query.search,

      availableFromGte: this.toDateOrUndefined(query.availableFromGte),

      availableUntilLte: this.toDateOrUndefined(query.availableUntilLte),

      createdAtGte: this.toDateOrUndefined(query.createdAtGte),

      updatedAtGte: this.toDateOrUndefined(query.updatedAtGte),
    };
  }

  private buildOrderInput(query: AssessmentQueryDto): OrderAssessmentInput {
    return {
      field: query.orderBy ?? ASSESSMENT_QUERY_DEFAULTS.ORDER_BY,
      direction:
        query.orderDirection ?? ASSESSMENT_QUERY_DEFAULTS.ORDER_DIRECTION,
    };
  }

  private getPagination(query: AssessmentQueryDto): {
    skip: number;
    take: number;
    page: number;
    limit: number;
  } {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);

    return {
      page,
      limit,
      skip: (page - 1) * limit,
      take: limit,
    };
  }

  private toDateOrUndefined(value: string | undefined): Date | undefined {
    if (!value) {
      return undefined;
    }

    return new Date(value);
  }
  private ensureAssessmentIsDraft(status: AssessmentStatus): void {
    if (status !== AssessmentStatus.DRAFT) {
      throw new BadRequestException(
        'Assessment can only be changed while it is in DRAFT status',
      );
    }
  }
  private validateAvailabilityWindow(
    availableFrom?: Date,
    availableUntil?: Date,
  ): void {
    if (availableFrom && Number.isNaN(availableFrom.getTime())) {
      throw new BadRequestException('availableFrom is invalid');
    }

    if (availableUntil && Number.isNaN(availableUntil.getTime())) {
      throw new BadRequestException('availableUntil is invalid');
    }

    if (availableFrom && availableUntil && availableFrom >= availableUntil) {
      throw new BadRequestException(
        'availableFrom must be before availableUntil',
      );
    }
  }
}
