// src/features/assessments/repositories/attempt.repository.ts

import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';

import {
  ActiveAttemptDetailRecord,
  AttemptResultRecord,
  CreateAttemptData,
  CreateOrResumeAttemptTransactionData,
  CreateOrResumeAttemptTransactionResult,
  CreatedAttemptRecord,
  IAttemptRepository,
  LearnerAssessmentEntryRecord,
  LearnerAttemptSummaryRecord,
  LearnerCourseAssessmentListRecord,
  LearnerEnrollmentRecord,
  SaveAnswerAttemptContextRecord,
  SavedAttemptAnswerRecord,
  SubmitProjectAttemptRecord,
  SubmitProjectWriteData,
  SubmitQuizAttemptAnswerRecord,
  SubmitQuizAttemptQuestionRecord,
  SubmitQuizAttemptRecord,
  SubmitQuizAttemptWriteData,
  SubmittedAttemptRecord,
  SubmittedProjectRecord,
} from '../interfaces/attempt.repository.interface';
import { PrismaService } from 'src/core/database/prisma.service';
import {
  AssessmentAttemptStatus,
  ProjectSubmissionStatus,
} from 'generated/prisma/enums';

@Injectable()
export class AttemptRepository implements IAttemptRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPublishedAssessmentsForLearnerCourse(
    courseId: string,
  ): Promise<LearnerCourseAssessmentListRecord[]> {
    return this.prisma.assessment.findMany({
      where: {
        courseId,
        status: 'PUBLISHED',
        isActive: true,
        deletedAt: null,
      },
      orderBy: [
        {
          order: 'asc',
        },
        {
          createdAt: 'asc',
        },
      ],
      select: {
        id: true,
        courseId: true,

        title: true,
        description: true,
        type: true,

        order: true,
        totalPoints: true,
        passingScore: true,

        maxAttempts: true,
        timeLimitMinutes: true,

        availableFrom: true,
        availableUntil: true,
      },
    });
  }

  /**
   *
   * Used by:
   * - getLearnerAssessment()
   * - createOrResumeAttempt()
   * - getAttemptHistory()
   *
   * Safety:
   * - Only finds assessment inside requested course.
   * - Does not load questions.
   * - Does not load answer keys.
   */
  async findAssessmentForLearnerEntry(
    courseId: string,
    assessmentId: string,
  ): Promise<LearnerAssessmentEntryRecord | null> {
    return this.prisma.assessment.findFirst({
      where: {
        id: assessmentId,
        courseId,
      },
      select: {
        id: true,
        courseId: true,

        title: true,
        description: true,
        type: true,
        status: true,

        totalPoints: true,
        passingScore: true,

        maxAttempts: true,
        timeLimitMinutes: true,

        availableFrom: true,
        availableUntil: true,

        isActive: true,
        deletedAt: true,
      },
    });
  }

  /**
   *
   * Used to verify learner is enrolled in the course.
   *
   * Your schema has:
   * @@unique([userId, courseId])
   */
  async findLearnerEnrollment(
    courseId: string,
    learnerId: string,
  ): Promise<LearnerEnrollmentRecord | null> {
    return this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: learnerId,
          courseId,
        },
      },
      select: {
        id: true,
        userId: true,
        courseId: true,

        status: true,
        isActive: true,
        deletedAt: true,
      },
    });
  }

  /**
   *
   * Used to compute:
   * - attemptsUsed
   * - attemptsRemaining
   * - latestAttempt
   * - canContinue
   * - canViewResult
   *
   * Safety:
   * - Does not return questions.
   * - Does not return learner answers.
   * - Does not return correct answers.
   */
  async findLearnerAttempts(
    assessmentId: string,
    learnerId: string,
  ): Promise<LearnerAttemptSummaryRecord[]> {
    return this.prisma.assessmentAttempt.findMany({
      where: {
        assessmentId,
        learnerId,
      },
      orderBy: {
        attemptNumber: 'asc',
      },
      select: {
        id: true,
        assessmentId: true,
        learnerId: true,

        attemptNumber: true,
        status: true,

        score: true,
        maxScore: true,
        passed: true,

        startedAt: true,
        submittedAt: true,
      },
    });
  }

  async findActiveAttempt(
    assessmentId: string,
    learnerId: string,
  ): Promise<LearnerAttemptSummaryRecord | null> {
    return this.prisma.assessmentAttempt.findFirst({
      where: {
        assessmentId,
        learnerId,
        status: AssessmentAttemptStatus.IN_PROGRESS,
      },
      orderBy: {
        attemptNumber: 'desc',
      },
      select: {
        id: true,
        assessmentId: true,
        learnerId: true,

        attemptNumber: true,
        status: true,

        score: true,
        maxScore: true,
        passed: true,

        startedAt: true,
        submittedAt: true,
      },
    });
  }

  async findLatestAttempt(
    assessmentId: string,
    learnerId: string,
  ): Promise<LearnerAttemptSummaryRecord | null> {
    return this.prisma.assessmentAttempt.findFirst({
      where: {
        assessmentId,
        learnerId,
      },
      orderBy: {
        attemptNumber: 'desc',
      },
      select: {
        id: true,
        assessmentId: true,
        learnerId: true,

        attemptNumber: true,
        status: true,

        score: true,
        maxScore: true,
        passed: true,

        startedAt: true,
        submittedAt: true,
      },
    });
  }

  async createAttempt(data: CreateAttemptData): Promise<CreatedAttemptRecord> {
    return this.prisma.assessmentAttempt.create({
      data: {
        assessmentId: data.assessmentId,
        learnerId: data.learnerId,
        attemptNumber: data.attemptNumber,
        status: data.status,
        score: data.score,
        maxScore: data.maxScore,
        passed: data.passed,
      },
      select: {
        id: true,
        assessmentId: true,
        learnerId: true,

        attemptNumber: true,
        status: true,

        score: true,
        maxScore: true,
        passed: true,

        startedAt: true,
        submittedAt: true,
      },
    });
  }

  async createOrResumeAttemptTransaction(
    data: CreateOrResumeAttemptTransactionData,
  ): Promise<CreateOrResumeAttemptTransactionResult> {
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw<{ id: string }[]>`
          SELECT id
          FROM assessment_attempts
          WHERE assessmentId = ${data.assessmentId}
            AND learnerId = ${data.learnerId}
          ORDER BY attemptNumber DESC
          FOR UPDATE
        `;

        const activeAttempt = await tx.assessmentAttempt.findFirst({
          where: {
            assessmentId: data.assessmentId,
            learnerId: data.learnerId,
            status: AssessmentAttemptStatus.IN_PROGRESS,
          },
          orderBy: {
            attemptNumber: 'desc',
          },
          select: {
            id: true,
            assessmentId: true,
            learnerId: true,

            attemptNumber: true,
            status: true,

            score: true,
            maxScore: true,
            passed: true,

            startedAt: true,
            submittedAt: true,
          },
        });

        if (activeAttempt) {
          return {
            kind: 'RESUMED',
            attempt: activeAttempt,
          };
        }

        const latestAttempt = await tx.assessmentAttempt.findFirst({
          where: {
            assessmentId: data.assessmentId,
            learnerId: data.learnerId,
          },
          orderBy: {
            attemptNumber: 'desc',
          },
          select: {
            attemptNumber: true,
          },
        });

        const nextAttemptNumber = latestAttempt
          ? latestAttempt.attemptNumber + 1
          : 1;

        if (data.maxAttempts !== null && nextAttemptNumber > data.maxAttempts) {
          return {
            kind: 'MAX_ATTEMPTS_REACHED',
            attempt: null,
          };
        }

        const createdAttempt = await tx.assessmentAttempt.create({
          data: {
            assessmentId: data.assessmentId,
            learnerId: data.learnerId,
            attemptNumber: nextAttemptNumber,
            status: data.status,
            score: data.score,
            maxScore: data.maxScore,
            passed: data.passed,
          },
          select: {
            id: true,
            assessmentId: true,
            learnerId: true,

            attemptNumber: true,
            status: true,

            score: true,
            maxScore: true,
            passed: true,

            startedAt: true,
            submittedAt: true,
          },
        });

        return {
          kind: 'CREATED',
          attempt: createdAttempt,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  async findActiveAttemptDetail(
    courseId: string,
    assessmentId: string,
    attemptId: string,
    learnerId: string,
  ): Promise<ActiveAttemptDetailRecord | null> {
    const attempt = await this.prisma.assessmentAttempt.findFirst({
      where: {
        id: attemptId,
        assessmentId,
        learnerId,
        assessment: {
          courseId,
        },
      },
      select: {
        id: true,
        assessmentId: true,
        learnerId: true,

        attemptNumber: true,
        status: true,

        score: true,
        maxScore: true,
        passed: true,

        startedAt: true,
        submittedAt: true,

        assessment: {
          select: {
            id: true,
            courseId: true,

            title: true,
            description: true,
            type: true,
            status: true,

            totalPoints: true,
            passingScore: true,
            timeLimitMinutes: true,

            availableFrom: true,
            availableUntil: true,

            isActive: true,
            deletedAt: true,

            questions: {
              orderBy: {
                order: 'asc',
              },
              select: {
                id: true,
                questionText: true,
                type: true,
                explanation: true,

                points: true,
                order: true,

                isActive: true,
                deletedAt: true,

                answers: {
                  take: 1,
                  select: {
                    correctOptionAnswer: true,
                    correctTextAnswer: true,
                    wrongAnswers: true,
                  },
                },
              },
            },
          },
        },

        answers: {
          select: {
            questionId: true,
            textAnswer: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!attempt) {
      return null;
    }

    return {
      id: attempt.id,
      assessmentId: attempt.assessmentId,
      learnerId: attempt.learnerId,

      attemptNumber: attempt.attemptNumber,
      status: attempt.status,

      score: attempt.score,
      maxScore: attempt.maxScore,
      passed: attempt.passed,

      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,

      assessment: {
        id: attempt.assessment.id,
        courseId: attempt.assessment.courseId,

        title: attempt.assessment.title,
        description: attempt.assessment.description,
        type: attempt.assessment.type,
        status: attempt.assessment.status,

        totalPoints: attempt.assessment.totalPoints,
        passingScore: attempt.assessment.passingScore,
        timeLimitMinutes: attempt.assessment.timeLimitMinutes,

        availableFrom: attempt.assessment.availableFrom,
        availableUntil: attempt.assessment.availableUntil,

        isActive: attempt.assessment.isActive,
        deletedAt: attempt.assessment.deletedAt,
      },

      questions: attempt.assessment.questions.map((question) => ({
        id: question.id,
        questionText: question.questionText,
        type: question.type,
        explanation: question.explanation,

        points: question.points,
        order: question.order,

        isActive: question.isActive,
        deletedAt: question.deletedAt,

        answer: question.answers[0] ?? null,
      })),

      savedAnswers: attempt.answers,
    };
  }

  async findSaveAnswerContext(
    courseId: string,
    assessmentId: string,
    attemptId: string,
    questionId: string,
    learnerId: string,
  ): Promise<SaveAnswerAttemptContextRecord | null> {
    const [attempt, question] = await this.prisma.$transaction([
      this.prisma.assessmentAttempt.findFirst({
        where: {
          id: attemptId,
          assessmentId,
          learnerId,
          assessment: {
            courseId,
          },
        },
        select: {
          id: true,
          assessmentId: true,
          learnerId: true,

          status: true,
          startedAt: true,

          assessment: {
            select: {
              id: true,
              courseId: true,

              type: true,
              status: true,

              isActive: true,
              deletedAt: true,

              timeLimitMinutes: true,

              availableFrom: true,
              availableUntil: true,
            },
          },
        },
      }),

      this.prisma.assessmentQuestion.findFirst({
        where: {
          id: questionId,
          assessmentId,
        },
        select: {
          id: true,
          assessmentId: true,

          type: true,

          isActive: true,
          deletedAt: true,

          answers: {
            take: 1,
            select: {
              correctOptionAnswer: true,
              correctTextAnswer: true,
              wrongAnswers: true,
            },
          },
        },
      }),
    ]);

    if (!attempt) {
      return null;
    }

    return {
      id: attempt.id,
      assessmentId: attempt.assessmentId,
      learnerId: attempt.learnerId,

      status: attempt.status,
      startedAt: attempt.startedAt,

      assessment: {
        id: attempt.assessment.id,
        courseId: attempt.assessment.courseId,

        type: attempt.assessment.type,
        status: attempt.assessment.status,

        isActive: attempt.assessment.isActive,
        deletedAt: attempt.assessment.deletedAt,

        timeLimitMinutes: attempt.assessment.timeLimitMinutes,

        availableFrom: attempt.assessment.availableFrom,
        availableUntil: attempt.assessment.availableUntil,
      },

      question: question
        ? {
            id: question.id,
            assessmentId: question.assessmentId,

            type: question.type,

            isActive: question.isActive,
            deletedAt: question.deletedAt,

            answer: question.answers[0] ?? null,
          }
        : null,
    };
  }

  async markAttemptFailedDueToExpiry(attemptId: string): Promise<void> {
    await this.prisma.assessmentAttempt.updateMany({
      where: {
        id: attemptId,
        status: AssessmentAttemptStatus.IN_PROGRESS,
      },
      data: {
        status: AssessmentAttemptStatus.FAILED,
        score: 0,
        passed: false,
        submittedAt: new Date(),
      },
    });
  }

  async upsertAttemptAnswer(params: {
    attemptId: string;
    questionId: string;
    textAnswer: string;
  }): Promise<SavedAttemptAnswerRecord | null> {
    return this.prisma.$transaction(async (tx) => {
      const lockedAttempt = await tx.$queryRaw<{ id: string }[]>`
        SELECT id
        FROM assessment_attempts
        WHERE id = ${params.attemptId}
          AND status = ${AssessmentAttemptStatus.IN_PROGRESS}
        FOR UPDATE
      `;

      if (lockedAttempt.length === 0) {
        return null;
      }

      return tx.assessmentAttemptAnswer.upsert({
        where: {
          attemptId_questionId: {
            attemptId: params.attemptId,
            questionId: params.questionId,
          },
        },
        create: {
          attemptId: params.attemptId,
          questionId: params.questionId,
          textAnswer: params.textAnswer,

          answerSnapshot: null,

          isCorrect: null,
          pointsEarned: null,
        },
        update: {
          textAnswer: params.textAnswer,

          isCorrect: null,
          pointsEarned: null,
        },
        select: {
          attemptId: true,
          questionId: true,
          textAnswer: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });
  }

  async findQuizAttemptForSubmit(
    courseId: string,
    assessmentId: string,
    attemptId: string,
    learnerId: string,
  ): Promise<SubmitQuizAttemptRecord | null> {
    const attempt = await this.prisma.assessmentAttempt.findFirst({
      where: {
        id: attemptId,
        assessmentId,
        learnerId,
        assessment: {
          courseId,
        },
      },
      select: {
        id: true,
        assessmentId: true,
        learnerId: true,

        attemptNumber: true,
        status: true,

        score: true,
        maxScore: true,
        passed: true,

        startedAt: true,
        submittedAt: true,

        assessment: {
          select: {
            id: true,
            courseId: true,

            title: true,
            type: true,
            status: true,

            isActive: true,
            deletedAt: true,

            totalPoints: true,
            passingScore: true,

            maxAttempts: true,
            timeLimitMinutes: true,

            availableFrom: true,
            availableUntil: true,

            reviewTiming: true,
            reviewContent: true,

            questions: {
              orderBy: {
                order: 'asc',
              },
              select: {
                id: true,
                questionText: true,
                type: true,
                explanation: true,

                points: true,
                order: true,

                isActive: true,
                deletedAt: true,

                answers: {
                  take: 1,
                  select: {
                    correctOptionAnswer: true,
                    correctTextAnswer: true,
                    wrongAnswers: true,
                  },
                },
              },
            },
          },
        },

        answers: {
          select: {
            id: true,
            questionId: true,
            textAnswer: true,
          },
        },
      },
    });

    if (!attempt) {
      return null;
    }

    const questions: SubmitQuizAttemptQuestionRecord[] =
      attempt.assessment.questions.map((question) => ({
        id: question.id,
        questionText: question.questionText,
        type: question.type,
        explanation: question.explanation,

        points: question.points,
        order: question.order,

        isActive: question.isActive,
        deletedAt: question.deletedAt,

        answer: question.answers[0]
          ? {
              correctOptionAnswer: question.answers[0].correctOptionAnswer,
              correctTextAnswer: question.answers[0].correctTextAnswer,
              wrongAnswers: question.answers[0].wrongAnswers,
            }
          : null,
      }));

    const savedAnswers: SubmitQuizAttemptAnswerRecord[] = attempt.answers.map(
      (answer) => ({
        id: answer.id,
        questionId: answer.questionId,
        textAnswer: answer.textAnswer,
      }),
    );

    return {
      id: attempt.id,
      assessmentId: attempt.assessmentId,
      learnerId: attempt.learnerId,

      attemptNumber: attempt.attemptNumber,
      status: attempt.status,

      score: attempt.score,
      maxScore: attempt.maxScore,
      passed: attempt.passed,

      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,

      assessment: {
        id: attempt.assessment.id,
        courseId: attempt.assessment.courseId,

        title: attempt.assessment.title,
        type: attempt.assessment.type,
        status: attempt.assessment.status,

        isActive: attempt.assessment.isActive,
        deletedAt: attempt.assessment.deletedAt,

        totalPoints: attempt.assessment.totalPoints,
        passingScore: attempt.assessment.passingScore,

        maxAttempts: attempt.assessment.maxAttempts,
        timeLimitMinutes: attempt.assessment.timeLimitMinutes,

        availableFrom: attempt.assessment.availableFrom,
        availableUntil: attempt.assessment.availableUntil,

        reviewTiming: attempt.assessment.reviewTiming,
        reviewContent: attempt.assessment.reviewContent,
      },

      questions,
      savedAnswers,
    };
  }

  async submitQuizAttemptTransaction(
    data: SubmitQuizAttemptWriteData,
  ): Promise<SubmittedAttemptRecord | null> {
    return this.prisma.$transaction(async (tx) => {
      const lockedAttempt = await tx.$queryRaw<{ id: string }[]>`
        SELECT id
        FROM assessment_attempts
        WHERE id = ${data.attemptId}
          AND status = ${AssessmentAttemptStatus.IN_PROGRESS}
        FOR UPDATE
      `;

      if (lockedAttempt.length === 0) {
        return null;
      }

      await Promise.all(
        data.gradedAnswers.map((answer) =>
          tx.assessmentAttemptAnswer.update({
            where: {
              id: answer.attemptAnswerId,
            },
            data: {
              isCorrect: answer.isCorrect,
              pointsEarned: answer.pointsEarned,
            },
          }),
        ),
      );

      return tx.assessmentAttempt.update({
        where: {
          id: data.attemptId,
        },
        data: {
          status: data.status,
          score: data.score,
          maxScore: data.maxScore,
          passed: data.passed,
          submittedAt: data.submittedAt,
        },
        select: {
          id: true,
          assessmentId: true,
          learnerId: true,

          attemptNumber: true,
          status: true,

          score: true,
          maxScore: true,
          passed: true,

          startedAt: true,
          submittedAt: true,
        },
      });
    });
  }

  async countLearnerAttempts(
    assessmentId: string,
    learnerId: string,
  ): Promise<number> {
    return this.prisma.assessmentAttempt.count({
      where: {
        assessmentId,
        learnerId,
      },
    });
  }

  async findAttemptResult(
    courseId: string,
    assessmentId: string,
    attemptId: string,
    learnerId: string,
  ): Promise<AttemptResultRecord | null> {
    const attempt = await this.prisma.assessmentAttempt.findFirst({
      where: {
        id: attemptId,
        assessmentId,
        learnerId,
        assessment: {
          courseId,
        },
      },
      select: {
        id: true,
        assessmentId: true,
        learnerId: true,

        attemptNumber: true,
        status: true,

        score: true,
        maxScore: true,
        passed: true,

        startedAt: true,
        submittedAt: true,

        assessment: {
          select: {
            id: true,
            courseId: true,

            title: true,
            type: true,
            status: true,

            isActive: true,
            deletedAt: true,

            maxAttempts: true,
            availableFrom: true,
            availableUntil: true,

            reviewTiming: true,
            reviewContent: true,

            questions: {
              orderBy: {
                order: 'asc',
              },
              select: {
                id: true,
                questionText: true,
                type: true,
                explanation: true,

                points: true,
                order: true,

                answers: {
                  take: 1,
                  select: {
                    correctOptionAnswer: true,
                    correctTextAnswer: true,
                  },
                },
              },
            },
          },
        },

        answers: {
          select: {
            questionId: true,
            textAnswer: true,
            isCorrect: true,
            pointsEarned: true,
          },
        },

        projectSubmission: {
          select: {
            id: true,
            status: true,

            githubUrl: true,
            deployUrl: true,
            documentUrl: true,
            note: true,

            score: true,
            feedback: true,

            submittedAt: true,
            gradedAt: true,
          },
        },
      },
    });

    if (!attempt) {
      return null;
    }

    return {
      id: attempt.id,
      assessmentId: attempt.assessmentId,
      learnerId: attempt.learnerId,

      attemptNumber: attempt.attemptNumber,
      status: attempt.status,

      score: attempt.score,
      maxScore: attempt.maxScore,
      passed: attempt.passed,

      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,

      assessment: {
        id: attempt.assessment.id,
        courseId: attempt.assessment.courseId,

        title: attempt.assessment.title,
        type: attempt.assessment.type,
        status: attempt.assessment.status,

        isActive: attempt.assessment.isActive,
        deletedAt: attempt.assessment.deletedAt,

        maxAttempts: attempt.assessment.maxAttempts,
        availableFrom: attempt.assessment.availableFrom,
        availableUntil: attempt.assessment.availableUntil,

        reviewTiming: attempt.assessment.reviewTiming,
        reviewContent: attempt.assessment.reviewContent,
      },

      questions: attempt.assessment.questions.map((question) => ({
        id: question.id,
        questionText: question.questionText,
        type: question.type,
        explanation: question.explanation,

        points: question.points,
        order: question.order,

        answer: question.answers[0] ?? null,
      })),

      answers: attempt.answers,

      projectSubmission: attempt.projectSubmission,
    };
  }

  async findProjectAttemptForSubmit(
    courseId: string,
    assessmentId: string,
    attemptId: string,
    learnerId: string,
  ): Promise<SubmitProjectAttemptRecord | null> {
    const attempt = await this.prisma.assessmentAttempt.findFirst({
      where: {
        id: attemptId,
        assessmentId,
        learnerId,
        assessment: {
          courseId,
        },
      },
      select: {
        id: true,
        assessmentId: true,
        learnerId: true,

        attemptNumber: true,
        status: true,

        startedAt: true,
        submittedAt: true,

        assessment: {
          select: {
            id: true,
            courseId: true,

            title: true,
            type: true,
            status: true,

            isActive: true,
            deletedAt: true,

            timeLimitMinutes: true,

            availableFrom: true,
            availableUntil: true,
          },
        },

        projectSubmission: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!attempt) {
      return null;
    }

    return {
      id: attempt.id,
      assessmentId: attempt.assessmentId,
      learnerId: attempt.learnerId,

      attemptNumber: attempt.attemptNumber,
      status: attempt.status,

      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,

      assessment: {
        id: attempt.assessment.id,
        courseId: attempt.assessment.courseId,

        title: attempt.assessment.title,
        type: attempt.assessment.type,
        status: attempt.assessment.status,

        isActive: attempt.assessment.isActive,
        deletedAt: attempt.assessment.deletedAt,

        timeLimitMinutes: attempt.assessment.timeLimitMinutes,

        availableFrom: attempt.assessment.availableFrom,
        availableUntil: attempt.assessment.availableUntil,
      },

      projectSubmission: attempt.projectSubmission,
    };
  }

  async submitProjectTransaction(
    data: SubmitProjectWriteData,
  ): Promise<SubmittedProjectRecord | null> {
    return this.prisma.$transaction(async (tx) => {
      const lockedAttempt = await tx.$queryRaw<{ id: string }[]>`
        SELECT id
        FROM assessment_attempts
        WHERE id = ${data.attemptId}
          AND status = ${AssessmentAttemptStatus.IN_PROGRESS}
        FOR UPDATE
      `;

      if (lockedAttempt.length === 0) {
        return null;
      }

      const existingSubmission = await tx.projectSubmission.findUnique({
        where: {
          attemptId: data.attemptId,
        },
        select: {
          id: true,
        },
      });

      if (existingSubmission) {
        return null;
      }

      const submission = await tx.projectSubmission.create({
        data: {
          attemptId: data.attemptId,

          githubUrl: data.githubUrl ?? null,
          deployUrl: data.deployUrl ?? null,
          documentUrl: data.documentUrl ?? null,
          note: data.note ?? null,

          status: ProjectSubmissionStatus.SUBMITTED,

          submittedAt: data.submittedAt,
        },
        select: {
          id: true,
          attemptId: true,

          status: true,

          githubUrl: true,
          deployUrl: true,
          documentUrl: true,
          note: true,

          score: true,
          feedback: true,

          submittedAt: true,
          gradedAt: true,
        },
      });

      await tx.assessmentAttempt.update({
        where: {
          id: data.attemptId,
        },
        data: {
          status: AssessmentAttemptStatus.SUBMITTED,
          submittedAt: data.submittedAt,
        },
      });

      return submission;
    });
  }
}
