// src/features/courses/repositories/prisma-course-review.repository.ts

import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import {
  CourseLevel,
  CourseReviewStatus,
  CourseStatus,
} from 'generated/prisma/enums';

import { PrismaService } from 'src/core/database/prisma.service';

import {
  AvailableReviewCourseModel,
  ClaimCourseForReviewResult,
  CourseReviewDecisionInput,
  CourseReviewDecisionModel,
  CourseReviewCourseModel,
  CourseReviewWorkspaceModel,
  FindAvailableReviewCoursesParams,
  FindReviewableCoursesParams,
  ICourseReviewRepository,
  InstructorCourseLatestReviewModel,
} from '../interfaces/course-review.repository.interface';

import {
  AvailableReviewerCourseSortField,
  ReviewerCourseSortField,
  SortDirection,
} from '../dtos/course/reviewer-course-query.dto';
import { InstructorCourseLatestReviewResponseDto } from '../dtos/course/instructor-course-review.dto';

const availableReviewCourseInclude = {
  courseCategories: {
    where: {
      category: {
        deletedAt: null,
        isActive: true,
      },
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  },
  instructors: {
    where: {
      deletedAt: null,
      isActive: true,
      instructor: {
        isActive: true,
      },
    },
    include: {
      instructor: {
        select: {
          id: true,
          fullName: true,
        },
      },
    },
    orderBy: {
      order: 'asc',
    },
  },
} satisfies Prisma.CourseInclude;

type PrismaAvailableReviewCourse = Prisma.CourseGetPayload<{
  include: typeof availableReviewCourseInclude;
}>;

const courseReviewWithCourseInclude = {
  course: {
    include: availableReviewCourseInclude,
  },
} satisfies Prisma.CourseReviewInclude;

type PrismaCourseReviewWithCourse = Prisma.CourseReviewGetPayload<{
  include: typeof courseReviewWithCourseInclude;
}>;

const courseReviewWorkspaceInclude = {
  course: {
    include: {
      courseCategories: {
        where: {
          category: {
            deletedAt: null,
            isActive: true,
          },
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              reviewerCategories: true,
            },
          },
        },
      },
      instructors: {
        where: {
          deletedAt: null,
          isActive: true,
          instructor: {
            isActive: true,
          },
        },
        include: {
          instructor: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
        orderBy: {
          order: 'asc',
        },
      },
      sections: {
        where: {
          deletedAt: null,
          isActive: true,
        },
        include: {
          lessons: {
            where: {
              deletedAt: null,
              isActive: true,
            },
            include: {
              files: {
                where: {
                  deletedAt: null,
                },
                orderBy: {
                  filename: 'asc',
                },
              },
            },
            orderBy: {
              lessonIndex: 'asc',
            },
          },
        },
        orderBy: {
          sectionIndex: 'asc',
        },
      },
    },
  },
} satisfies Prisma.CourseReviewInclude;

type PrismaCourseReviewWorkspace = Prisma.CourseReviewGetPayload<{
  include: typeof courseReviewWorkspaceInclude;
}>;

@Injectable()
export class CourseReviewRepository implements ICourseReviewRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAvailableCourses(
    params: FindAvailableReviewCoursesParams,
  ): Promise<AvailableReviewCourseModel[]> {
    const where = this.buildAvailableReviewCourseWhere(params);

    const availableCourses = await this.prisma.course.findMany({
      where,
      include: availableReviewCourseInclude,
      orderBy: this.buildAvailableReviewCourseOrderBy(
        params.sortField,
        params.sortDirection,
      ),
      skip: params.offset,
      take: params.limit,
    });

    return availableCourses.map((course) =>
      this.toAvailableReviewCourseModel(course),
    );
  }
  private buildAvailableReviewCourseWhere(params: {
    reviewerId: string;
    search?: string;
    level?: CourseLevel;
    categoryId?: string;
  }): Prisma.CourseWhereInput {
    const search = params.search?.trim();

    return {
      ...this.buildReviewableCourseScope(params.reviewerId),
      status: CourseStatus.IN_REVIEW,
      reviewClaimedById: null,

      ...(params.level
        ? {
            level: params.level,
          }
        : {}),

      ...(search
        ? {
            OR: [
              {
                title: {
                  contains: search,
                },
              },
              {
                shortDescription: {
                  contains: search,
                },
              },
              {
                description: {
                  contains: search,
                },
              },
            ],
          }
        : {}),

      courseCategories: {
        some: {
          ...this.buildAuthorizedCourseCategoryScope(params.reviewerId),

          ...(params.categoryId
            ? {
                categoryId: params.categoryId,
              }
            : {}),
        },
      },
    };
  }

  async countAvailableCourses(
    params: Omit<
      FindAvailableReviewCoursesParams,
      'limit' | 'offset' | 'sortField' | 'sortDirection'
    >,
  ): Promise<number> {
    return this.prisma.course.count({
      where: this.buildAvailableReviewCourseWhere(params),
    });
  }

  async claimCourseForReview(
    reviewerId: string,
    courseId: string,
  ): Promise<ClaimCourseForReviewResult> {
    return this.prisma.$transaction(async (tx) => {
      const course = await tx.course.findFirst({
        where: {
          id: courseId,
          ...this.buildReviewableCourseScope(reviewerId),
          status: CourseStatus.IN_REVIEW,
          courseCategories: {
            some: this.buildAuthorizedCourseCategoryScope(reviewerId),
          },
        },
        select: {
          id: true,
          reviewClaimedById: true,
        },
      });

      if (!course) {
        return {
          status: 'not_found',
        };
      }

      if (course.reviewClaimedById) {
        return {
          status: 'already_claimed',
        };
      }

      const claimedAt = new Date();

      const claimResult = await tx.course.updateMany({
        where: {
          id: courseId,
          status: CourseStatus.IN_REVIEW,
          reviewClaimedById: null,
        },
        data: {
          reviewClaimedById: reviewerId,
          reviewClaimedAt: claimedAt,
        },
      });

      if (claimResult.count !== 1) {
        return {
          status: 'already_claimed',
        };
      }

      const review = await tx.courseReview.create({
        data: {
          courseId,
          reviewerId,
          status: CourseReviewStatus.PENDING,
          submittedAt: claimedAt,
        },
        select: {
          id: true,
          status: true,
          submittedAt: true,
          course: {
            select: {
              id: true,
              status: true,
              reviewClaimedById: true,
              reviewClaimedAt: true,
            },
          },
        },
      });

      return {
        status: 'claimed',
        data: {
          reviewId: review.id,
          reviewStatus: review.status,
          submittedAt: review.submittedAt,
          course: review.course,
        },
      };
    });
  }

  async findReviewableCourses(
    params: FindReviewableCoursesParams,
  ): Promise<CourseReviewCourseModel[]> {
    const where = this.buildReviewableCourseWhere(params);

    const orderBy = this.buildReviewableCourseOrderBy(
      params.sortField,
      params.sortDirection,
    );

    const reviewTasks = await this.prisma.courseReview.findMany({
      where,
      include: courseReviewWithCourseInclude,
      orderBy,
      skip: params.offset,
      take: params.limit,
    });

    return reviewTasks.map((reviewTask) =>
      this.toCourseReviewCourseModel(reviewTask),
    );
  }

  async countReviewableCourses(
    params: Omit<
      FindReviewableCoursesParams,
      'limit' | 'offset' | 'sortField' | 'sortDirection'
    >,
  ): Promise<number> {
    const where = this.buildReviewableCourseWhere(params);

    return this.prisma.courseReview.count({
      where,
    });
  }

  async findReviewWorkspace(
    reviewerId: string,
    reviewId: string,
  ): Promise<CourseReviewWorkspaceModel | null> {
    const reviewTask = await this.prisma.courseReview.findFirst({
      where: this.buildValidReviewTaskWhere(reviewerId, reviewId),
      include: courseReviewWorkspaceInclude,
    });

    return reviewTask ? this.toCourseReviewWorkspaceModel(reviewTask) : null;
  }

  async submitReviewDecision(
    input: CourseReviewDecisionInput,
  ): Promise<CourseReviewDecisionModel | null> {
    return this.prisma.$transaction(async (tx) => {
      const reviewTask = await tx.courseReview.findFirst({
        where: {
          ...this.buildValidReviewTaskWhere(input.reviewerId, input.reviewId),
          status: CourseReviewStatus.PENDING,
          course: {
            ...this.buildReviewableCourseScope(input.reviewerId),
            status: CourseStatus.IN_REVIEW,
            reviewClaimedById: input.reviewerId,
            courseCategories: {
              some: this.buildAuthorizedCourseCategoryScope(input.reviewerId),
            },
          },
        },
        select: {
          id: true,
          courseId: true,
        },
      });

      if (!reviewTask) {
        return null;
      }

      const reviewedAt = new Date();

      const course = await tx.course.update({
        where: {
          id: reviewTask.courseId,
        },
        data: {
          status: input.courseStatus,
          publishedAt:
            input.courseStatus === CourseStatus.PUBLISHED ? reviewedAt : null,
          reviewClaimedById: null,
          reviewClaimedAt: null,
        },
        select: {
          id: true,
          status: true,
          publishedAt: true,
          updatedAt: true,
        },
      });

      const review = await tx.courseReview.update({
        where: {
          id: reviewTask.id,
        },
        data: {
          status: input.reviewStatus,
          reviewNote: input.reviewNote ?? null,
          reviewedAt,
        },
        select: {
          id: true,
          status: true,
          reviewNote: true,
          submittedAt: true,
          reviewedAt: true,
        },
      });

      return {
        reviewId: review.id,
        reviewStatus: review.status,
        reviewNote: review.reviewNote,
        submittedAt: review.submittedAt,
        reviewedAt: review.reviewedAt,
        course,
      };
    });
  }

  async findLatestCompletedReviewByCourseId(
    courseId: string,
  ): Promise<InstructorCourseLatestReviewModel | null> {
    const review = await this.prisma.courseReview.findFirst({
      where: {
        courseId,
        reviewedAt: {
          not: null,
        },
        status: {
          in: [
            CourseReviewStatus.APPROVED,
            CourseReviewStatus.CHANGES_REQUESTED,
            CourseReviewStatus.REJECTED,
          ],
        },
      },
      select: {
        id: true,
        courseId: true,
        status: true,
        reviewNote: true,
        submittedAt: true,
        reviewedAt: true,
        course: {
          select: {
            status: true,
          },
        },
      },
      orderBy: [
        {
          reviewedAt: 'desc',
        },
        {
          submittedAt: 'desc',
        },
      ],
    });

    if (!review) {
      return null;
    }

    return {
      reviewId: review.id,
      courseId: review.courseId,
      courseStatus: review.course.status,
      reviewStatus: review.status,
      reviewNote: review.reviewNote,
      submittedAt: review.submittedAt,
      reviewedAt: review.reviewedAt,
    };
  }

  private buildReviewableCourseWhere(params: {
    reviewerId: string;
    search?: string;
    level?: CourseLevel;
    status?: CourseStatus;
    categoryId?: string;
    reviewStatus: CourseReviewStatus;
  }): Prisma.CourseReviewWhereInput {
    const search = params.search?.trim();

    return {
      reviewerId: params.reviewerId,
      status: params.reviewStatus,

      course: {
        ...this.buildReviewableCourseScope(params.reviewerId),
        reviewClaimedById: params.reviewerId,

        ...(params.status
          ? {
              status: params.status,
            }
          : {}),

        ...(params.level
          ? {
              level: params.level,
            }
          : {}),

        ...(search
          ? {
              OR: [
                {
                  title: {
                    contains: search,
                  },
                },
                {
                  shortDescription: {
                    contains: search,
                  },
                },
                {
                  description: {
                    contains: search,
                  },
                },
              ],
            }
          : {}),

        courseCategories: {
          some: {
            ...this.buildAuthorizedCourseCategoryScope(params.reviewerId),

            ...(params.categoryId
              ? {
                  categoryId: params.categoryId,
                }
              : {}),
          },
        },
      },
    };
  }

  private buildValidReviewTaskWhere(
    reviewerId: string,
    reviewId: string,
  ): Prisma.CourseReviewWhereInput {
    return {
      id: reviewId,
      reviewerId,
      course: {
        ...this.buildReviewableCourseScope(reviewerId),
        status: CourseStatus.IN_REVIEW,
        reviewClaimedById: reviewerId,
      },
    };
  }

  private buildReviewableCourseScope(
    reviewerId: string,
  ): Prisma.CourseWhereInput {
    return {
      deletedAt: null,
      isActive: true,
      courseCategories: {
        some: {
          category: {
            deletedAt: null,
            isActive: true,
            reviewerCategories: {
              some: {
                reviewerId,
              },
            },
          },
        },
      },
    };
  }

  private buildAuthorizedCourseCategoryScope(
    reviewerId: string,
  ): Prisma.CourseCategoryWhereInput {
    return {
      category: {
        deletedAt: null,
        isActive: true,
        reviewerCategories: {
          some: {
            reviewerId,
            isActive: true,
          },
        },
      },
    };
  }

  private buildReviewableCourseOrderBy(
    sortField: ReviewerCourseSortField,
    sortDirection: SortDirection,
  ): Prisma.CourseReviewOrderByWithRelationInput {
    switch (sortField) {
      case ReviewerCourseSortField.TITLE:
        return {
          course: {
            title: sortDirection,
          },
        };

      case ReviewerCourseSortField.CREATED_AT:
        return {
          course: {
            createdAt: sortDirection,
          },
        };

      case ReviewerCourseSortField.UPDATED_AT:
        return {
          course: {
            updatedAt: sortDirection,
          },
        };

      case ReviewerCourseSortField.REVIEWED_AT:
        return {
          reviewedAt: sortDirection,
        };

      case ReviewerCourseSortField.SUBMITTED_AT:
      default:
        return {
          submittedAt: sortDirection,
        };
    }
  }

  private buildAvailableReviewCourseOrderBy(
    sortField: AvailableReviewerCourseSortField,
    sortDirection: SortDirection,
  ): Prisma.CourseOrderByWithRelationInput {
    switch (sortField) {
      case AvailableReviewerCourseSortField.TITLE:
        return {
          title: sortDirection,
        };

      case AvailableReviewerCourseSortField.CREATED_AT:
        return {
          createdAt: sortDirection,
        };

      case AvailableReviewerCourseSortField.UPDATED_AT:
      default:
        return {
          updatedAt: sortDirection,
        };
    }
  }

  private toAvailableReviewCourseModel(
    course: PrismaAvailableReviewCourse,
  ): AvailableReviewCourseModel {
    return {
      id: course.id,
      title: course.title,
      slug: course.slug,
      shortDescription: course.shortDescription,
      description: course.description,
      whatYouWillLearn: this.parseStringArrayJson(course.whatYouWillLearn),
      requirements: this.parseStringArrayJson(course.requirements),
      thumbnailUrl: course.thumbnailUrl,
      level: course.level,
      price: course.price === null ? null : Number(course.price),
      language: course.language,
      durationInMinutes: course.durationInMinutes,
      certificateEnabled: course.certificateEnabled,
      status: course.status,
      isActive: course.isActive,
      publishedAt: course.publishedAt,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
      deletedAt: course.deletedAt,

      categories: course.courseCategories.map((courseCategory) => ({
        id: courseCategory.category.id,
        name: courseCategory.category.name,
        slug: courseCategory.category.slug,
      })),

      instructors: course.instructors.map((courseInstructor) => ({
        id: courseInstructor.instructor.id,
        fullName: courseInstructor.instructor.fullName,
      })),
    };
  }

  private toCourseReviewCourseModel(
    reviewTask: PrismaCourseReviewWithCourse,
  ): CourseReviewCourseModel {
    const course = this.toAvailableReviewCourseModel(reviewTask.course);

    return {
      reviewId: reviewTask.id,
      reviewStatus: reviewTask.status,
      reviewNote: reviewTask.reviewNote,
      submittedAt: reviewTask.submittedAt,
      reviewedAt: reviewTask.reviewedAt,
      course,
    };
  }

  private toCourseReviewWorkspaceModel(
    reviewTask: PrismaCourseReviewWorkspace,
  ): CourseReviewWorkspaceModel {
    const courseModel = this.toCourseReviewCourseModel(reviewTask);

    return {
      ...courseModel,
      isReviewerAuthorized: reviewTask.course.courseCategories.some(
        (courseCategory) =>
          courseCategory.category.reviewerCategories.some(
            (reviewerCategory) =>
              reviewerCategory.reviewerId === reviewTask.reviewerId &&
              reviewerCategory.isActive,
          ),
      ),
      course: {
        ...courseModel.course,
        sections: reviewTask.course.sections.map((section) => ({
          id: section.id,
          courseId: section.courseId,
          title: section.title,
          description: section.description,
          sectionIndex: section.sectionIndex,
          isActive: section.isActive,
          createdAt: section.createdAt,
          updatedAt: section.updatedAt,
          deletedAt: section.deletedAt,
          lessons: section.lessons.map((lesson) => ({
            id: lesson.id,
            sectionId: lesson.sectionId,
            title: lesson.title,
            description: lesson.description,
            lessonIndex: lesson.lessonIndex,
            isActive: lesson.isActive,
            createdAt: lesson.createdAt,
            updatedAt: lesson.updatedAt,
            deletedAt: lesson.deletedAt,
            files: lesson.files.map((file) => ({
              id: file.id,
              lessonId: file.lessonId,
              cloudinaryPublicId: file.cloudinaryPublicId,
              url: file.url,
              type: file.type,
              filename: file.filename,
              mimeType: file.mimeType,
              sizeInBytes: file.sizeInBytes,
              createdAt: file.createdAt,
              updatedAt: file.updatedAt,
              deletedAt: file.deletedAt,
            })),
          })),
        })),
      },
    };
  }

  private parseStringArrayJson(
    value: Prisma.JsonValue | null,
  ): string[] | null {
    if (!Array.isArray(value)) {
      return null;
    }

    return value.filter((item): item is string => typeof item === 'string');
  }
}
