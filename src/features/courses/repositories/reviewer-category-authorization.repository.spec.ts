jest.mock(
  'generated/prisma/client',
  () => ({
    Prisma: {},
  }),
  { virtual: true },
);

jest.mock(
  'generated/prisma/enums',
  () => ({
    UserRole: {
      REVIEWER: 'REVIEWER',
    },
  }),
  { virtual: true },
);

jest.mock(
  'src/core/database/prisma.service',
  () => ({
    PrismaService: class PrismaService {},
  }),
  { virtual: true },
);

import { UserRole } from 'generated/prisma/enums';
import { ReviewerCategoryAuthorizationRepository } from './reviewer-category-authorization.repository';

type PrismaServiceMock = {
  user: {
    count: jest.Mock;
  };
  category: {
    findMany: jest.Mock;
  };
  courseReviewerCategory: {
    findMany: jest.Mock;
    updateMany: jest.Mock;
    upsert: jest.Mock;
  };
  $transaction: jest.Mock;
};

const reviewerId = '11111111-1111-4111-8111-111111111111';
const categoryId = '22222222-2222-4222-8222-222222222222';
const secondCategoryId = '33333333-3333-4333-8333-333333333333';

describe('ReviewerCategoryAuthorizationRepository', () => {
  let repository: ReviewerCategoryAuthorizationRepository;
  let prisma: PrismaServiceMock;

  beforeEach(() => {
    prisma = {
      user: {
        count: jest.fn(),
      },
      category: {
        findMany: jest.fn(),
      },
      courseReviewerCategory: {
        findMany: jest.fn(),
        updateMany: jest.fn(),
        upsert: jest.fn(),
      },
      $transaction: jest.fn(async (callback) => callback(prisma)),
    };

    repository = new ReviewerCategoryAuthorizationRepository(
      prisma as unknown as ConstructorParameters<
        typeof ReviewerCategoryAuthorizationRepository
      >[0],
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('checks that the target user is an active reviewer', async () => {
    prisma.user.count.mockResolvedValue(1);

    const result = await repository.existsActiveReviewer(reviewerId);

    expect(prisma.user.count).toHaveBeenCalledWith({
      where: {
        id: reviewerId,
        isActive: true,
        role: UserRole.REVIEWER,
      },
    });
    expect(result).toBe(true);
  });

  it('finds only active categories by ids', async () => {
    prisma.category.findMany.mockResolvedValue([makeCategory()]);

    const result = await repository.findActiveCategoriesByIds([categoryId]);

    expect(prisma.category.findMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: [categoryId],
        },
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });
    expect(result).toEqual([makeCategory()]);
  });

  it('returns an empty category list without querying for empty ids', async () => {
    const result = await repository.findActiveCategoriesByIds([]);

    expect(prisma.category.findMany).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('lists active reviewer category authorizations', async () => {
    prisma.courseReviewerCategory.findMany.mockResolvedValue([
      makeAuthorization(),
    ]);

    const result = await repository.findAuthorizedCategories(reviewerId);

    expect(prisma.courseReviewerCategory.findMany).toHaveBeenCalledWith({
      where: {
        reviewerId,
        isActive: true,
        category: {
          isActive: true,
          deletedAt: null,
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
      orderBy: {
        categoryId: 'asc',
      },
    });
    expect(result).toEqual([makeCategory()]);
  });

  it('replaces reviewer category authorizations in a transaction', async () => {
    prisma.courseReviewerCategory.findMany.mockResolvedValue([
      makeAuthorization(),
      makeAuthorization({
        categoryId: secondCategoryId,
        category: {
          id: secondCategoryId,
          name: 'Frontend',
          slug: 'frontend',
        },
      }),
    ]);

    const result = await repository.replaceAuthorizedCategories(reviewerId, [
      categoryId,
      secondCategoryId,
    ]);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.courseReviewerCategory.updateMany).toHaveBeenCalledWith({
      where: {
        reviewerId,
        isActive: true,
        categoryId: {
          notIn: [categoryId, secondCategoryId],
        },
      },
      data: {
        isActive: false,
      },
    });
    expect(prisma.courseReviewerCategory.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.courseReviewerCategory.upsert).toHaveBeenCalledWith({
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
    });
    expect(result).toEqual([
      makeCategory(),
      {
        id: secondCategoryId,
        name: 'Frontend',
        slug: 'frontend',
      },
    ]);
  });

  it('deactivates all active authorizations when replacement list is empty', async () => {
    prisma.courseReviewerCategory.findMany.mockResolvedValue([]);

    const result = await repository.replaceAuthorizedCategories(reviewerId, []);

    expect(prisma.courseReviewerCategory.updateMany).toHaveBeenCalledWith({
      where: {
        reviewerId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });
    expect(prisma.courseReviewerCategory.upsert).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });
});

function makeCategory() {
  return {
    id: categoryId,
    name: 'Backend',
    slug: 'backend',
  };
}

function makeAuthorization(
  overrides: Partial<{
    reviewerId: string;
    categoryId: string;
    isActive: boolean;
    category: {
      id: string;
      name: string;
      slug: string;
    };
  }> = {},
) {
  return {
    reviewerId,
    categoryId,
    isActive: true,
    category: makeCategory(),
    createdAt: new Date('2026-06-10T00:00:00.000Z'),
    updatedAt: new Date('2026-06-10T00:00:00.000Z'),
    ...overrides,
  };
}
