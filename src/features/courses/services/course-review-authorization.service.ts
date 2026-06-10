import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import {
  ReplaceReviewerCategoryAuthorizationsDto,
  ReviewerCategoryAuthorizationsResponseDto,
} from '../dtos/review-authorization/reviewer-category-authorization.dto';
import type {
  IReviewerCategoryAuthorizationRepository,
  ReviewerAuthorizedCategoryModel,
} from '../interfaces/reviewer-category-authorization.repository.interface';
import { REVIEWER_CATEGORY_AUTHORIZATION_REPOSITORY } from '../repositories/reviewer-category-authorization-repository.token';

@Injectable()
export class CourseReviewAuthorizationService {
  constructor(
    @Inject(REVIEWER_CATEGORY_AUTHORIZATION_REPOSITORY)
    private readonly reviewerCategoryAuthorizationRepository: IReviewerCategoryAuthorizationRepository,
  ) {}

  async getReviewerCategoryAuthorizations(
    reviewerId: string,
  ): Promise<ReviewerCategoryAuthorizationsResponseDto> {
    await this.ensureActiveReviewerExists(reviewerId);

    const categories =
      await this.reviewerCategoryAuthorizationRepository.findAuthorizedCategories(
        reviewerId,
      );

    return this.toResponseDto(reviewerId, categories);
  }

  async replaceReviewerCategoryAuthorizations(
    reviewerId: string,
    dto: ReplaceReviewerCategoryAuthorizationsDto,
  ): Promise<ReviewerCategoryAuthorizationsResponseDto> {
    await this.ensureActiveReviewerExists(reviewerId);
    await this.ensureCategoriesCanBeAuthorized(dto.categoryIds);

    const categories =
      await this.reviewerCategoryAuthorizationRepository.replaceAuthorizedCategories(
        reviewerId,
        dto.categoryIds,
      );

    return this.toResponseDto(reviewerId, categories);
  }

  private async ensureActiveReviewerExists(reviewerId: string): Promise<void> {
    const reviewerExists =
      await this.reviewerCategoryAuthorizationRepository.existsActiveReviewer(
        reviewerId,
      );

    if (!reviewerExists) {
      throw new NotFoundException('REVIEWER_NOT_FOUND');
    }
  }

  private async ensureCategoriesCanBeAuthorized(
    categoryIds: string[],
  ): Promise<void> {
    const uniqueCategoryIds = new Set(categoryIds);

    if (uniqueCategoryIds.size !== categoryIds.length) {
      throw new BadRequestException('DUPLICATE_CATEGORY_IDS');
    }

    if (uniqueCategoryIds.size === 0) {
      return;
    }

    const categories =
      await this.reviewerCategoryAuthorizationRepository.findActiveCategoriesByIds(
        [...uniqueCategoryIds],
      );

    if (categories.length !== uniqueCategoryIds.size) {
      throw new NotFoundException('CATEGORY_ID_NOT_FOUND');
    }
  }

  private toResponseDto(
    reviewerId: string,
    categories: ReviewerAuthorizedCategoryModel[],
  ): ReviewerCategoryAuthorizationsResponseDto {
    return plainToInstance(
      ReviewerCategoryAuthorizationsResponseDto,
      {
        reviewerId,
        categories,
      },
      {
        excludeExtraneousValues: true,
      },
    );
  }
}
