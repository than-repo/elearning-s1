// src/features/assessments/repositories/assessment-answers.repository.ts

import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from 'src/core/database/prisma.service';

import {
  AssessmentAnswer,
  CreateAssessmentAnswerInput,
  IAssessmentAnswerRepository,
  UpdateAssessmentAnswerInput,
  UpsertAssessmentAnswerInput,
} from '../interfaces/assessment-answers.repository.interface';
import { AssessmentAnswersMapper } from '../mappers/assessment-answers.mapper';

@Injectable()
export class AssessmentAnswersRepository implements IAssessmentAnswerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createAnswer(
    input: CreateAssessmentAnswerInput,
  ): Promise<AssessmentAnswer> {
    const answer = await this.prisma.assessmentAnswer.create({
      data: {
        questionId: input.questionId,
        correctOptionAnswer: input.correctOptionAnswer ?? null,
        correctTextAnswer: input.correctTextAnswer ?? null,
        wrongAnswers: this.toNullableJson(input.wrongAnswers),
      },
    });

    return AssessmentAnswersMapper.toAssessmentAnswer(answer);
  }

  async upsertAnswerByQuestionId(
    questionId: string,
    input: UpsertAssessmentAnswerInput,
  ): Promise<AssessmentAnswer> {
    const data = {
      correctOptionAnswer: input.correctOptionAnswer ?? null,
      correctTextAnswer: input.correctTextAnswer ?? null,
      wrongAnswers: this.toNullableJson(input.wrongAnswers),
    };

    const answer = await this.prisma.assessmentAnswer.upsert({
      where: {
        questionId,
      },
      create: {
        questionId,
        ...data,
      },
      update: data,
    });

    return AssessmentAnswersMapper.toAssessmentAnswer(answer);
  }

  async findAnswerById(answerId: string): Promise<AssessmentAnswer | null> {
    const answer = await this.prisma.assessmentAnswer.findUnique({
      where: {
        id: answerId,
      },
    });

    return answer ? AssessmentAnswersMapper.toAssessmentAnswer(answer) : null;
  }

  async findAnswerByQuestionId(
    questionId: string,
  ): Promise<AssessmentAnswer | null> {
    const answer = await this.prisma.assessmentAnswer.findUnique({
      where: {
        questionId,
      },
    });

    return answer ? AssessmentAnswersMapper.toAssessmentAnswer(answer) : null;
  }

  async findManyByQuestionIds(
    questionIds: string[],
  ): Promise<AssessmentAnswer[]> {
    if (questionIds.length === 0) {
      return [];
    }

    const answers = await this.prisma.assessmentAnswer.findMany({
      where: {
        questionId: {
          in: questionIds,
        },
      },
    });

    return answers.map((answer) =>
      AssessmentAnswersMapper.toAssessmentAnswer(answer),
    );
  }

  async updateAnswer(
    answerId: string,
    input: UpdateAssessmentAnswerInput,
  ): Promise<AssessmentAnswer> {
    const data: Prisma.AssessmentAnswerUpdateInput = {};

    if (input.correctOptionAnswer !== undefined) {
      data.correctOptionAnswer = input.correctOptionAnswer;
    }

    if (input.correctTextAnswer !== undefined) {
      data.correctTextAnswer = input.correctTextAnswer;
    }

    if (input.wrongAnswers !== undefined) {
      data.wrongAnswers = this.toNullableJson(input.wrongAnswers);
    }

    const answer = await this.prisma.assessmentAnswer.update({
      where: {
        id: answerId,
      },
      data,
    });

    return AssessmentAnswersMapper.toAssessmentAnswer(answer);
  }

  async deleteAnswerById(answerId: string): Promise<boolean> {
    const result = await this.prisma.assessmentAnswer.deleteMany({
      where: {
        id: answerId,
      },
    });

    return result.count > 0;
  }

  async deleteAnswerByQuestionId(questionId: string): Promise<boolean> {
    const result = await this.prisma.assessmentAnswer.deleteMany({
      where: {
        questionId,
      },
    });

    return result.count > 0;
  }

  private toNullableJson(
    value: string[] | null | undefined,
  ): Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue {
    if (value === undefined || value === null) {
      return Prisma.DbNull;
    }

    return value;
  }
}
