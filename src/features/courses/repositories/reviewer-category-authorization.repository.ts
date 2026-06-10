import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { UserRole } from 'generated/prisma/enums';
import { PrismaService } from 'src/core/database/prisma.service';
import {
  IReviewerCategoryAuthorizationRepository,
  ReviewerAuthorizedCategoryModel,
} from '../interfaces/reviewer-category-authorization.repository.interface';

const authorizedCategorySelect = {
  id: true,
  name: true,
  slug: true,
} satisfies Prisma.CategorySelect;

const reviewerCategoryWithCategoryInclude = {
  category: {
    select: authorizedCategorySelect,
  },
} satisfies Prisma.CourseReviewerCategoryInclude;

type CourseReviewerCategoryWithCategory =
  Prisma.CourseReviewerCategoryGetPayload<{
    include: typeof reviewerCategoryWithCategoryInclude;
  }>;

@Injectable()
export class ReviewerCategoryAuthorizationRepository implements IReviewerCategoryAuthorizationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async existsActiveReviewer(reviewerId: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: {
        id: reviewerId,
        isActive: true,
        role: UserRole.REVIEWER,
      },
    });

    return count > 0;
  }

  async findActiveCategoriesByIds(
    categoryIds: string[],
  ): Promise<ReviewerAuthorizedCategoryModel[]> {
    if (categoryIds.length === 0) {
      return [];
    }

    return this.prisma.category.findMany({
      where: {
        id: {
          in: categoryIds,
        },
        isActive: true,
        deletedAt: null,
      },
      select: authorizedCategorySelect,
    });
  }

  async findAuthorizedCategories(
    reviewerId: string,
  ): Promise<ReviewerAuthorizedCategoryModel[]> {
    const authorizations = await this.prisma.courseReviewerCategory.findMany({
      where: {
        reviewerId,
        isActive: true,
        category: {
          isActive: true,
          deletedAt: null,
        },
      },
      include: reviewerCategoryWithCategoryInclude,
      orderBy: {
        categoryId: 'asc',
      },
    });

    return authorizations.map((authorization) =>
      this.toAuthorizedCategoryModel(authorization),
    );
  }

  async replaceAuthorizedCategories(
    reviewerId: string,
    categoryIds: string[],
  ): Promise<ReviewerAuthorizedCategoryModel[]> {
    await this.prisma.$transaction(async (tx) => {
      await tx.courseReviewerCategory.updateMany({
        where: {
          reviewerId,
          isActive: true,
          ...(categoryIds.length > 0
            ? {
                categoryId: {
                  notIn: categoryIds,
                },
              }
            : {}),
        },
        data: {
          isActive: false,
        },
      });

      await Promise.all(
        categoryIds.map((categoryId) =>
          tx.courseReviewerCategory.upsert({
            where: {
              reviewerId_categoryId: {
                reviewerId,
                categoryId,
              },
            },
            update: {
              isActive: true,
            },
            create: {
              reviewerId,
              categoryId,
              isActive: true,
            },
          }),
        ),
      );
    });

    return this.findAuthorizedCategories(reviewerId);
  }

  private toAuthorizedCategoryModel(
    authorization: CourseReviewerCategoryWithCategory,
  ): ReviewerAuthorizedCategoryModel {
    return {
      id: authorization.category.id,
      name: authorization.category.name,
      slug: authorization.category.slug,
    };
  }
}
