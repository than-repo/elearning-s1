export interface ReviewerAuthorizedCategoryModel {
  id: string;
  name: string;
  slug: string;
}

export interface ReviewerCategoryAuthorizationsModel {
  reviewerId: string;
  categories: ReviewerAuthorizedCategoryModel[];
}

export interface IReviewerCategoryAuthorizationRepository {
  existsActiveReviewer(reviewerId: string): Promise<boolean>;

  findActiveCategoriesByIds(
    categoryIds: string[],
  ): Promise<ReviewerAuthorizedCategoryModel[]>;

  findAuthorizedCategories(
    reviewerId: string,
  ): Promise<ReviewerAuthorizedCategoryModel[]>;

  replaceAuthorizedCategories(
    reviewerId: string,
    categoryIds: string[],
  ): Promise<ReviewerAuthorizedCategoryModel[]>;
}
