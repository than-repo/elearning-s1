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
  CourseReviewCourseModel,
  FindReviewableCoursesParams,
  ICourseReviewRepository,
} from '../interfaces/course-review.repository.interface';

import {
  ReviewerCourseSortField,
  SortDirection,
} from '../dtos/course/reviewer-course-query.dto';

const courseReviewWithCourseInclude = {
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
    },
  },
} satisfies Prisma.CourseReviewInclude;

type PrismaCourseReviewWithCourse = Prisma.CourseReviewGetPayload<{
  include: typeof courseReviewWithCourseInclude;
}>;

@Injectable()
export class CourseReviewRepository implements ICourseReviewRepository {
  constructor(private readonly prisma: PrismaService) {}

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
        deletedAt: null,
        isActive: true,

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
            ...(params.categoryId
              ? {
                  categoryId: params.categoryId,
                }
              : {}),

            category: {
              deletedAt: null,
              isActive: true,
              reviewerCategories: {
                some: {
                  reviewerId: params.reviewerId,
                  isActive: true,
                },
              },
            },
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

  private toCourseReviewCourseModel(
    reviewTask: PrismaCourseReviewWithCourse,
  ): CourseReviewCourseModel {
    const course = reviewTask.course;

    return {
      reviewId: reviewTask.id,
      reviewStatus: reviewTask.status,
      reviewNote: reviewTask.reviewNote,
      submittedAt: reviewTask.submittedAt,
      reviewedAt: reviewTask.reviewedAt,

      course: {
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
