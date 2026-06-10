import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type {
  IReviewerCategoryAuthorizationRepository,
  ReviewerAuthorizedCategoryModel,
} from '../interfaces/reviewer-category-authorization.repository.interface';
import { REVIEWER_CATEGORY_AUTHORIZATION_REPOSITORY } from '../repositories/reviewer-category-authorization-repository.token';
import { CourseReviewAuthorizationService } from './course-review-authorization.service';

type ReviewerCategoryAuthorizationRepositoryMock =
  jest.Mocked<IReviewerCategoryAuthorizationRepository>;

const reviewerId = '11111111-1111-4111-8111-111111111111';
const categoryId = '22222222-2222-4222-8222-222222222222';
const secondCategoryId = '33333333-3333-4333-8333-333333333333';

describe('CourseReviewAuthorizationService', () => {
  let service: CourseReviewAuthorizationService;
  let repository: ReviewerCategoryAuthorizationRepositoryMock;

  beforeEach(async () => {
    repository = {
      existsActiveReviewer: jest.fn(),
      findActiveCategoriesByIds: jest.fn(),
      findAuthorizedCategories: jest.fn(),
      replaceAuthorizedCategories: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourseReviewAuthorizationService,
        {
          provide: REVIEWER_CATEGORY_AUTHORIZATION_REPOSITORY,
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get(CourseReviewAuthorizationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('lists active reviewer category authorizations', async () => {
    repository.existsActiveReviewer.mockResolvedValue(true);
    repository.findAuthorizedCategories.mockResolvedValue([makeCategory()]);

    const result =
      await service.getReviewerCategoryAuthorizations(reviewerId);

    expect(repository.existsActiveReviewer).toHaveBeenCalledWith(reviewerId);
    expect(repository.findAuthorizedCategories).toHaveBeenCalledWith(
      reviewerId,
    );
    expect(result).toEqual({
      reviewerId,
      categories: [makeCategory()],
    });
  });

  it('replaces category authorizations after validating reviewer and categories', async () => {
    const categories = [
      makeCategory(),
      makeCategory({
        id: secondCategoryId,
        name: 'Frontend',
        slug: 'frontend',
      }),
    ];
    repository.existsActiveReviewer.mockResolvedValue(true);
    repository.findActiveCategoriesByIds.mockResolvedValue(categories);
    repository.replaceAuthorizedCategories.mockResolvedValue(categories);

    const result = await service.replaceReviewerCategoryAuthorizations(
      reviewerId,
      {
        categoryIds: [categoryId, secondCategoryId],
      },
    );

    expect(repository.findActiveCategoriesByIds).toHaveBeenCalledWith([
      categoryId,
      secondCategoryId,
    ]);
    expect(repository.replaceAuthorizedCategories).toHaveBeenCalledWith(
      reviewerId,
      [categoryId, secondCategoryId],
    );
    expect(result).toEqual({
      reviewerId,
      categories,
    });
  });

  it('allows an empty replacement list to revoke all category authorizations', async () => {
    repository.existsActiveReviewer.mockResolvedValue(true);
    repository.replaceAuthorizedCategories.mockResolvedValue([]);

    const result = await service.replaceReviewerCategoryAuthorizations(
      reviewerId,
      {
        categoryIds: [],
      },
    );

    expect(repository.findActiveCategoriesByIds).not.toHaveBeenCalled();
    expect(repository.replaceAuthorizedCategories).toHaveBeenCalledWith(
      reviewerId,
      [],
    );
    expect(result).toEqual({
      reviewerId,
      categories: [],
    });
  });

  it('rejects duplicate category ids', async () => {
    repository.existsActiveReviewer.mockResolvedValue(true);

    await expect(
      service.replaceReviewerCategoryAuthorizations(reviewerId, {
        categoryIds: [categoryId, categoryId],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repository.findActiveCategoriesByIds).not.toHaveBeenCalled();
    expect(repository.replaceAuthorizedCategories).not.toHaveBeenCalled();
  });

  it('rejects missing or inactive categories', async () => {
    repository.existsActiveReviewer.mockResolvedValue(true);
    repository.findActiveCategoriesByIds.mockResolvedValue([makeCategory()]);

    await expect(
      service.replaceReviewerCategoryAuthorizations(reviewerId, {
        categoryIds: [categoryId, secondCategoryId],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(repository.replaceAuthorizedCategories).not.toHaveBeenCalled();
  });

  it('rejects missing, inactive, or non-reviewer users', async () => {
    repository.existsActiveReviewer.mockResolvedValue(false);

    await expect(
      service.getReviewerCategoryAuthorizations(reviewerId),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(repository.findAuthorizedCategories).not.toHaveBeenCalled();
  });
});

function makeCategory(
  overrides: Partial<ReviewerAuthorizedCategoryModel> = {},
): ReviewerAuthorizedCategoryModel {
  return {
    id: categoryId,
    name: 'Backend',
    slug: 'backend',
    ...overrides,
  };
}
