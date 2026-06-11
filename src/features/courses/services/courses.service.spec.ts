jest.mock(
  'generated/prisma/client',
  () => {
    class PrismaClientKnownRequestError extends Error {
      code: string;
      clientVersion: string;
      meta?: Record<string, unknown>;

      constructor(
        message: string,
        options: {
          code: string;
          clientVersion: string;
          meta?: Record<string, unknown>;
        },
      ) {
        super(message);
        this.code = options.code;
        this.clientVersion = options.clientVersion;
        this.meta = options.meta;
      }
    }

    return {
      Prisma: {
        PrismaClientKnownRequestError,
      },
    };
  },
  { virtual: true },
);

jest.mock(
  'generated/prisma/enums',
  () => ({
    CourseLevel: {
      BEGINNER: 'BEGINNER',
      INTERMEDIATE: 'INTERMEDIATE',
      ADVANCE: 'ADVANCE',
      ALL_LEVELS: 'ALL_LEVELS',
    },
    CourseStatus: {
      DRAFT: 'DRAFT',
      PUBLISHED: 'PUBLISHED',
      ARCHIVED: 'ARCHIVED',
      IN_REVIEW: 'IN_REVIEW',
      CHANGES_REQUESTED: 'CHANGES_REQUESTED',
    },
  }),
  { virtual: true },
);

jest.mock(
  'src/common/utils/clean-data-util',
  () => ({
    cleanData: (data: Record<string, unknown>) =>
      Object.fromEntries(
        Object.entries(data).filter(([, value]) => value !== undefined),
      ),
  }),
  { virtual: true },
);

jest.mock(
  'src/common/utils/slugify.util',
  () => ({
    slugify: (name: string) =>
      name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
  }),
  { virtual: true },
);

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from 'generated/prisma/client';
import { CourseLevel, CourseStatus } from 'generated/prisma/enums';

import type {
  Category,
  ICategoryRepository,
} from '../interfaces/category.repository.interface';
import type {
  CourseModel,
  ICourseRepository,
} from '../interfaces/course.repository.interface';
import { CATEGORY_REPOSITORY } from '../repositories/category-repository.token';
import { COURSE_REPOSITORY } from '../repositories/course-repository.token';
import { CourseAccessService } from './course-access.service';
import { CoursesService } from './courses.service';

type CourseRepositoryMock = jest.Mocked<ICourseRepository>;
type CategoryRepositoryMock = jest.Mocked<
  Pick<ICategoryRepository, 'findManyByIds'>
>;
type CourseAccessServiceMock = jest.Mocked<
  Pick<CourseAccessService, 'ensureInstructorCanManageCourse'>
>;

const instructorId = '11111111-1111-4111-8111-111111111111';
const otherInstructorId = '22222222-2222-4222-8222-222222222222';
const courseId = '33333333-3333-4333-8333-333333333333';
const categoryId = '44444444-4444-4444-8444-444444444444';
const secondCategoryId = '55555555-5555-4555-8555-555555555555';

describe('CoursesService', () => {
  let service: CoursesService;
  let courseRepository: CourseRepositoryMock;
  let categoryRepository: CategoryRepositoryMock;
  let courseAccessService: CourseAccessServiceMock;

  beforeEach(async () => {
    courseRepository = createCourseRepositoryMock();
    categoryRepository = {
      findManyByIds: jest.fn(),
    };
    courseAccessService = {
      ensureInstructorCanManageCourse: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        {
          provide: CourseAccessService,
          useValue: courseAccessService,
        },
        {
          provide: COURSE_REPOSITORY,
          useValue: courseRepository,
        },
        {
          provide: CATEGORY_REPOSITORY,
          useValue: categoryRepository,
        },
      ],
    }).compile();

    service = module.get(CoursesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAllPublic', () => {
    it('returns public courses with default pagination, sorting, and visibility filters', async () => {
      const course = makeCourse({
        status: CourseStatus.PUBLISHED,
        isActive: true,
      });
      courseRepository.findMany.mockResolvedValue([course]);
      courseRepository.count.mockResolvedValue(1);

      const result = await service.findAllPublic({});

      expect(courseRepository.findMany).toHaveBeenCalledWith({
        where: {
          status: CourseStatus.PUBLISHED,
          isActive: true,
        },
        orderBy: {
          field: 'createdAt',
          direction: 'desc',
        },
        limit: 10,
        offset: 0,
      });
      expect(courseRepository.count).toHaveBeenCalledWith({
        status: CourseStatus.PUBLISHED,
        isActive: true,
      });
      expect(result.meta).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });
      expect(result.data[0]).toMatchObject({
        id: course.id,
        title: course.title,
        slug: course.slug,
      });
      expect(result.data[0].status).toBeUndefined();
      expect(result.data[0].isActive).toBeUndefined();
      expect(result.data[0].createdAt).toBeUndefined();
      expect(result.data[0].updatedAt).toBeUndefined();
      expect(result.data[0].deletedAt).toBeUndefined();
    });

    it('clamps unsafe pagination and returns correct pagination meta', async () => {
      courseRepository.findMany.mockResolvedValue([makeCourse()]);
      courseRepository.count.mockResolvedValue(75);

      const result = await service.findAllPublic({
        page: 0,
        limit: 100,
      });

      expect(courseRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 50,
          offset: 0,
        }),
      );
      expect(result.meta).toEqual({
        page: 1,
        limit: 50,
        total: 75,
        totalPages: 2,
        hasNextPage: true,
        hasPreviousPage: false,
      });
    });

    it('converts published date filters before repository calls', async () => {
      courseRepository.findMany.mockResolvedValue([]);
      courseRepository.count.mockResolvedValue(0);

      await service.findAllPublic({
        publishedFrom: '2026-01-01T00:00:00.000Z',
        publishedTo: '2026-02-01T00:00:00.000Z',
      });

      const params = courseRepository.findMany.mock.calls[0][0];
      expect(params?.where?.publishedFrom).toEqual(
        new Date('2026-01-01T00:00:00.000Z'),
      );
      expect(params?.where?.publishedTo).toEqual(
        new Date('2026-02-01T00:00:00.000Z'),
      );
    });

    it('rejects an invalid price range', async () => {
      await expect(
        service.findAllPublic({
          minPrice: 100,
          maxPrice: 50,
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.findAllPublic({
          minPrice: 100,
          maxPrice: 50,
        }),
      ).rejects.toThrow('MIN_PRICE_CANNOT_EXCEED_MAX_PRICE');
      expect(courseRepository.findMany).not.toHaveBeenCalled();
    });

    it('rejects an invalid published date range', async () => {
      await expect(
        service.findAllPublic({
          publishedFrom: '2026-03-01T00:00:00.000Z',
          publishedTo: '2026-02-01T00:00:00.000Z',
        }),
      ).rejects.toThrow('PUBLISHED_FROM_CANNOT_EXCEED_PUBLISHED_TO');
      expect(courseRepository.findMany).not.toHaveBeenCalled();
    });
  });

  describe('findCourseBySlug', () => {
    it('returns a public course by slug', async () => {
      const course = makeCourse({ status: CourseStatus.PUBLISHED });
      courseRepository.findBySlug.mockResolvedValue(course);

      const result = await service.findCourseBySlug(course.slug);

      expect(courseRepository.findBySlug).toHaveBeenCalledWith(course.slug);
      expect(result).toMatchObject({
        id: course.id,
        title: course.title,
        slug: course.slug,
      });
      expect(result.status).toBeUndefined();
    });

    it('throws when a course slug is not found', async () => {
      courseRepository.findBySlug.mockResolvedValue(null);

      await expect(service.findCourseBySlug('missing')).rejects.toThrow(
        'COURSE NOT FOUND',
      );
    });
  });

  describe('createDraftCourse', () => {
    it('creates a draft course and returns instructor-visible fields', async () => {
      const dto = makeCreateCourseDto();
      const createdCourse = makeCourse({
        title: dto.title,
        slug: 'nestjs-masterclass',
        status: CourseStatus.DRAFT,
      });
      categoryRepository.findManyByIds.mockResolvedValue([
        makeCategory({ id: categoryId }),
      ]);
      courseRepository.existsBySlug.mockResolvedValue(false);
      courseRepository.createDraftCourse.mockResolvedValue(createdCourse);

      const result = await service.createDraftCourse(instructorId, dto);

      expect(categoryRepository.findManyByIds).toHaveBeenCalledWith([
        categoryId,
      ]);
      expect(courseRepository.existsBySlug).toHaveBeenCalledWith(
        'nestjs-masterclass',
        undefined,
      );
      expect(courseRepository.createDraftCourse).toHaveBeenCalledWith({
        title: dto.title,
        slug: 'nestjs-masterclass',
        shortDescription: dto.shortDescription,
        description: dto.description,
        whatYouWillLearn: dto.whatYouWillLearn,
        requirements: dto.requirements,
        level: dto.level,
        price: dto.price,
        language: dto.language,
        certificateEnabled: dto.certificateEnabled,
        status: CourseStatus.DRAFT,
        instructorId,
        categoryIds: dto.categoryIds,
      });
      expect(result.status).toBe(CourseStatus.DRAFT);
      expect(result.isActive).toBe(true);
      expect(result.createdAt).toEqual(createdCourse.createdAt);
    });

    it('rejects empty categories', async () => {
      await expect(
        service.createDraftCourse(instructorId, {
          ...makeCreateCourseDto(),
          categoryIds: [],
        }),
      ).rejects.toThrow('COURSE_REQUIRES_AT_LEAST_ONE_CATEGORY');
    });

    it('rejects duplicate categories', async () => {
      await expect(
        service.createDraftCourse(instructorId, {
          ...makeCreateCourseDto(),
          categoryIds: [categoryId, categoryId],
        }),
      ).rejects.toThrow('DUPLICATE_CATEGORY_IDS');
      expect(categoryRepository.findManyByIds).not.toHaveBeenCalled();
    });

    it('rejects missing categories', async () => {
      categoryRepository.findManyByIds.mockResolvedValue([]);

      await expect(
        service.createDraftCourse(instructorId, makeCreateCourseDto()),
      ).rejects.toThrow('CATEGORY_ID_NOT_FOUND');
    });

    it('rejects inactive categories', async () => {
      categoryRepository.findManyByIds.mockResolvedValue([
        makeCategory({ id: categoryId, isActive: false }),
      ]);

      await expect(
        service.createDraftCourse(instructorId, makeCreateCourseDto()),
      ).rejects.toThrow('CATEGORY_ID_NOT_FOUND');
    });

    it('uses the next slug suffix when the base slug already exists', async () => {
      const dto = makeCreateCourseDto();
      categoryRepository.findManyByIds.mockResolvedValue([
        makeCategory({ id: categoryId }),
      ]);
      courseRepository.existsBySlug
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      courseRepository.createDraftCourse.mockResolvedValue(
        makeCourse({ slug: 'nestjs-masterclass-1' }),
      );

      await service.createDraftCourse(instructorId, dto);

      expect(courseRepository.existsBySlug).toHaveBeenNthCalledWith(
        1,
        'nestjs-masterclass',
        undefined,
      );
      expect(courseRepository.existsBySlug).toHaveBeenNthCalledWith(
        2,
        'nestjs-masterclass-1',
        undefined,
      );
      expect(courseRepository.createDraftCourse).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'nestjs-masterclass-1' }),
      );
    });

    it('rejects a title that cannot generate a slug', async () => {
      categoryRepository.findManyByIds.mockResolvedValue([
        makeCategory({ id: categoryId }),
      ]);

      await expect(
        service.createDraftCourse(instructorId, {
          ...makeCreateCourseDto(),
          title: '!!!',
        }),
      ).rejects.toThrow('COURSE_TITLE_CANNOT_GENERATE_SLUG');
    });

    it('retries slug conflicts during create and succeeds on the third attempt', async () => {
      categoryRepository.findManyByIds.mockResolvedValue([
        makeCategory({ id: categoryId }),
      ]);
      courseRepository.existsBySlug
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      courseRepository.createDraftCourse
        .mockRejectedValueOnce(makePrismaUniqueSlugError())
        .mockRejectedValueOnce(makePrismaUniqueSlugError())
        .mockResolvedValueOnce(makeCourse({ slug: 'nestjs-masterclass-2' }));

      const result = await service.createDraftCourse(
        instructorId,
        makeCreateCourseDto(),
      );

      expect(courseRepository.createDraftCourse).toHaveBeenCalledTimes(3);
      expect(courseRepository.createDraftCourse).toHaveBeenLastCalledWith(
        expect.objectContaining({ slug: 'nestjs-masterclass-2' }),
      );
      expect(result.slug).toBe('nestjs-masterclass-2');
    });

    it('rethrows a non-slug Prisma conflict during create', async () => {
      const error = makePrismaUniqueError(['title']);
      categoryRepository.findManyByIds.mockResolvedValue([
        makeCategory({ id: categoryId }),
      ]);
      courseRepository.existsBySlug.mockResolvedValue(false);
      courseRepository.createDraftCourse.mockRejectedValue(error);

      await expect(
        service.createDraftCourse(instructorId, makeCreateCourseDto()),
      ).rejects.toBe(error);
      expect(courseRepository.createDraftCourse).toHaveBeenCalledTimes(1);
    });

    it('rethrows a slug conflict after the last create retry', async () => {
      const error = makePrismaUniqueSlugError();
      categoryRepository.findManyByIds.mockResolvedValue([
        makeCategory({ id: categoryId }),
      ]);
      courseRepository.existsBySlug.mockResolvedValue(false);
      courseRepository.createDraftCourse.mockRejectedValue(error);

      await expect(
        service.createDraftCourse(instructorId, makeCreateCourseDto()),
      ).rejects.toBe(error);
      expect(courseRepository.createDraftCourse).toHaveBeenCalledTimes(3);
    });
  });

  describe('updateDraftCourse', () => {
    it('updates a draft course with cleaned input and instructor access', async () => {
      const existingCourse = makeCourse({ status: CourseStatus.DRAFT });
      const updatedCourse = makeCourse({
        title: 'Updated Title',
        status: CourseStatus.DRAFT,
      });
      courseRepository.findById.mockResolvedValue(existingCourse);
      courseRepository.updateDraftCourse.mockResolvedValue(updatedCourse);

      const result = await service.updateDraftCourse(instructorId, courseId, {
        title: 'Updated Title',
        shortDescription: undefined,
        price: 20,
      });

      expect(courseRepository.findById).toHaveBeenCalledWith(courseId);
      expect(
        courseAccessService.ensureInstructorCanManageCourse,
      ).toHaveBeenCalledWith(courseId, instructorId);
      expect(courseRepository.existsBySlug).toHaveBeenCalledWith(
        'updated-title',
        existingCourse.id,
      );
      expect(courseRepository.updateDraftCourse).toHaveBeenCalledWith(
        courseId,
        {
          title: 'Updated Title',
          price: 20,
          slug: 'updated-title',
        },
      );
      expect(result.status).toBe(CourseStatus.DRAFT);
    });

    it('allows changes-requested courses to be updated', async () => {
      courseRepository.findById.mockResolvedValue(
        makeCourse({ status: CourseStatus.CHANGES_REQUESTED }),
      );
      courseRepository.updateDraftCourse.mockResolvedValue(
        makeCourse({ status: CourseStatus.CHANGES_REQUESTED }),
      );

      await expect(
        service.updateDraftCourse(instructorId, courseId, { price: 10 }),
      ).resolves.toBeDefined();
    });

    it('does not regenerate a slug when the title is unchanged', async () => {
      const existingCourse = makeCourse({ title: 'NestJS Masterclass' });
      courseRepository.findById.mockResolvedValue(existingCourse);
      courseRepository.updateDraftCourse.mockResolvedValue(existingCourse);

      await service.updateDraftCourse(instructorId, courseId, {
        title: 'NestJS Masterclass',
      });

      expect(courseRepository.existsBySlug).not.toHaveBeenCalled();
      expect(courseRepository.updateDraftCourse).toHaveBeenCalledWith(
        courseId,
        {
          title: 'NestJS Masterclass',
        },
      );
    });

    it('validates categories when categoryIds is present', async () => {
      courseRepository.findById.mockResolvedValue(makeCourse());
      categoryRepository.findManyByIds.mockResolvedValue([
        makeCategory({ id: categoryId }),
        makeCategory({ id: secondCategoryId }),
      ]);
      courseRepository.updateDraftCourse.mockResolvedValue(makeCourse());

      await service.updateDraftCourse(instructorId, courseId, {
        categoryIds: [categoryId, secondCategoryId],
      });

      expect(categoryRepository.findManyByIds).toHaveBeenCalledWith([
        categoryId,
        secondCategoryId,
      ]);
      expect(courseRepository.updateDraftCourse).toHaveBeenCalledWith(
        courseId,
        {
          categoryIds: [categoryId, secondCategoryId],
        },
      );
    });

    it('rejects empty categories during update', async () => {
      courseRepository.findById.mockResolvedValue(makeCourse());

      await expect(
        service.updateDraftCourse(instructorId, courseId, {
          categoryIds: [],
        }),
      ).rejects.toThrow('COURSE_REQUIRES_AT_LEAST_ONE_CATEGORY');
      expect(courseRepository.updateDraftCourse).not.toHaveBeenCalled();
    });

    it('throws when the course does not exist', async () => {
      courseRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateDraftCourse(instructorId, courseId, { title: 'New' }),
      ).rejects.toThrow('COURSE_NOT_FOUND');
      expect(
        courseAccessService.ensureInstructorCanManageCourse,
      ).not.toHaveBeenCalled();
    });

    it('propagates instructor access errors', async () => {
      const error = new NotFoundException('COURSE NOT FOUND');
      courseRepository.findById.mockResolvedValue(makeCourse());
      courseAccessService.ensureInstructorCanManageCourse.mockRejectedValue(
        error,
      );

      await expect(
        service.updateDraftCourse(otherInstructorId, courseId, { price: 1 }),
      ).rejects.toBe(error);
      expect(courseRepository.updateDraftCourse).not.toHaveBeenCalled();
    });

    it.each([
      CourseStatus.PUBLISHED,
      CourseStatus.ARCHIVED,
      CourseStatus.IN_REVIEW,
    ])('rejects %s courses during update', async (status) => {
      courseRepository.findById.mockResolvedValue(makeCourse({ status }));

      await expect(
        service.updateDraftCourse(instructorId, courseId, { price: 1 }),
      ).rejects.toThrow('ONLY_DRAFT_COURSE_CAN_BE_UPDATED');
      expect(courseRepository.updateDraftCourse).not.toHaveBeenCalled();
    });

    it('retries slug conflicts during update and succeeds on the third attempt', async () => {
      courseRepository.findById.mockResolvedValue(
        makeCourse({ title: 'Original Title' }),
      );
      courseRepository.existsBySlug
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      courseRepository.updateDraftCourse
        .mockRejectedValueOnce(makePrismaUniqueSlugError())
        .mockRejectedValueOnce(makePrismaUniqueSlugError())
        .mockResolvedValueOnce(makeCourse({ slug: 'new-title-2' }));

      const result = await service.updateDraftCourse(instructorId, courseId, {
        title: 'New Title',
      });

      expect(courseRepository.updateDraftCourse).toHaveBeenCalledTimes(3);
      expect(courseRepository.updateDraftCourse).toHaveBeenLastCalledWith(
        courseId,
        {
          title: 'New Title',
          slug: 'new-title-2',
        },
      );
      expect(result.slug).toBe('new-title-2');
    });
  });

  describe('findInstructorCourses', () => {
    it('scopes courses to the authenticated instructor and exposes instructor fields', async () => {
      const course = makeCourse({ status: CourseStatus.DRAFT });
      courseRepository.findMany.mockResolvedValue([course]);
      courseRepository.count.mockResolvedValue(11);

      const result = await service.findInstructorCourses(instructorId, {
        instructorId: otherInstructorId,
        search: 'nestjs',
        categoryId,
        minPrice: 0,
        maxPrice: 100,
        publishedFrom: '2026-01-01T00:00:00.000Z',
        publishedTo: '2026-02-01T00:00:00.000Z',
      });

      expect(courseRepository.findMany).toHaveBeenCalledWith({
        where: {
          search: 'nestjs',
          categoryId,
          instructorId,
          minPrice: 0,
          maxPrice: 100,
          publishedFrom: new Date('2026-01-01T00:00:00.000Z'),
          publishedTo: new Date('2026-02-01T00:00:00.000Z'),
        },
        orderBy: {
          field: 'createdAt',
          direction: 'desc',
        },
        limit: 10,
        offset: 0,
      });
      expect(courseRepository.count).toHaveBeenCalledWith({
        search: 'nestjs',
        categoryId,
        instructorId,
        minPrice: 0,
        maxPrice: 100,
        publishedFrom: new Date('2026-01-01T00:00:00.000Z'),
        publishedTo: new Date('2026-02-01T00:00:00.000Z'),
      });
      expect(result.data[0].status).toBe(CourseStatus.DRAFT);
      expect(result.data[0].createdAt).toEqual(course.createdAt);
      expect(result.meta).toEqual({
        page: 1,
        limit: 10,
        total: 11,
        totalPages: 2,
        hasNextPage: true,
        hasPreviousPage: false,
      });
    });

    it('rejects invalid instructor course query ranges', async () => {
      await expect(
        service.findInstructorCourses(instructorId, {
          publishedFrom: '2026-03-01T00:00:00.000Z',
          publishedTo: '2026-02-01T00:00:00.000Z',
        }),
      ).rejects.toThrow('PUBLISHED_FROM_CANNOT_EXCEED_PUBLISHED_TO');
      expect(courseRepository.findMany).not.toHaveBeenCalled();
    });
  });

  describe('deleteDraftCourse', () => {
    it('soft deletes an owned draft course', async () => {
      courseRepository.findById.mockResolvedValue(
        makeCourse({ status: CourseStatus.DRAFT }),
      );
      courseRepository.softDelete.mockResolvedValue(
        makeCourse({ status: CourseStatus.DRAFT, deletedAt: new Date() }),
      );

      const result = await service.deleteDraftCourse(instructorId, courseId);

      expect(courseRepository.findById).toHaveBeenCalledWith(courseId);
      expect(
        courseAccessService.ensureInstructorCanManageCourse,
      ).toHaveBeenCalledWith(courseId, instructorId);
      expect(courseRepository.softDelete).toHaveBeenCalledWith(courseId);
      expect(result).toEqual({
        message: 'DRAFT_COURSE_DELETED_SUCCESSFULLY',
      });
    });

    it('throws when deleting a missing course', async () => {
      courseRepository.findById.mockResolvedValue(null);

      await expect(
        service.deleteDraftCourse(instructorId, courseId),
      ).rejects.toThrow('COURSE_NOT_FOUND');
      expect(courseRepository.softDelete).not.toHaveBeenCalled();
    });

    it('propagates instructor access errors during delete', async () => {
      const error = new NotFoundException('COURSE NOT FOUND');
      courseRepository.findById.mockResolvedValue(makeCourse());
      courseAccessService.ensureInstructorCanManageCourse.mockRejectedValue(
        error,
      );

      await expect(
        service.deleteDraftCourse(otherInstructorId, courseId),
      ).rejects.toBe(error);
      expect(courseRepository.softDelete).not.toHaveBeenCalled();
    });

    it.each([
      CourseStatus.PUBLISHED,
      CourseStatus.ARCHIVED,
      CourseStatus.IN_REVIEW,
      CourseStatus.CHANGES_REQUESTED,
    ])('rejects deleting %s courses', async (status) => {
      courseRepository.findById.mockResolvedValue(makeCourse({ status }));

      await expect(
        service.deleteDraftCourse(instructorId, courseId),
      ).rejects.toThrow('ONLY_DRAFT_COURSE_CAN_BE_DELETED');
      expect(courseRepository.softDelete).not.toHaveBeenCalled();
    });
  });

  describe('submitDraftCourseForReview', () => {
    it('submits an owned draft course for review', async () => {
      const submittedCourse = makeCourse({ status: CourseStatus.IN_REVIEW });
      courseRepository.findById.mockResolvedValue(
        makeCourse({ status: CourseStatus.DRAFT }),
      );
      courseRepository.submitForReview.mockResolvedValue(submittedCourse);

      const result = await service.submitDraftCourseForReview(
        instructorId,
        courseId,
      );

      expect(courseRepository.findById).toHaveBeenCalledWith(courseId);
      expect(
        courseAccessService.ensureInstructorCanManageCourse,
      ).toHaveBeenCalledWith(courseId, instructorId);
      expect(courseRepository.submitForReview).toHaveBeenCalledWith(courseId);
      expect(result.status).toBe(CourseStatus.IN_REVIEW);
    });

    it('submits an owned changes-requested course for review', async () => {
      const submittedCourse = makeCourse({ status: CourseStatus.IN_REVIEW });
      courseRepository.findById.mockResolvedValue(
        makeCourse({ status: CourseStatus.CHANGES_REQUESTED }),
      );
      courseRepository.submitForReview.mockResolvedValue(submittedCourse);

      const result = await service.submitDraftCourseForReview(
        instructorId,
        courseId,
      );

      expect(courseRepository.submitForReview).toHaveBeenCalledWith(courseId);
      expect(result.status).toBe(CourseStatus.IN_REVIEW);
    });

    it('throws when submitting a missing course', async () => {
      courseRepository.findById.mockResolvedValue(null);

      await expect(
        service.submitDraftCourseForReview(instructorId, courseId),
      ).rejects.toThrow('COURSE_NOT_FOUND');
      expect(courseRepository.submitForReview).not.toHaveBeenCalled();
    });

    it('propagates instructor access errors during submit', async () => {
      const error = new NotFoundException('COURSE NOT FOUND');
      courseRepository.findById.mockResolvedValue(
        makeCourse({ status: CourseStatus.DRAFT }),
      );
      courseAccessService.ensureInstructorCanManageCourse.mockRejectedValue(
        error,
      );

      await expect(
        service.submitDraftCourseForReview(otherInstructorId, courseId),
      ).rejects.toBe(error);
      expect(courseRepository.submitForReview).not.toHaveBeenCalled();
    });

    it.each([
      CourseStatus.IN_REVIEW,
      CourseStatus.PUBLISHED,
      CourseStatus.ARCHIVED,
    ])('rejects submitting %s courses', async (status) => {
      courseRepository.findById.mockResolvedValue(makeCourse({ status }));

      await expect(
        service.submitDraftCourseForReview(instructorId, courseId),
      ).rejects.toThrow(
        'ONLY_DRAFT_OR_CHANGES_REQUESTED_COURSE_CAN_BE_SUBMITTED_FOR_REVIEW',
      );
      expect(courseRepository.submitForReview).not.toHaveBeenCalled();
    });

    it('returns an invalid status error when the repository update loses a race', async () => {
      courseRepository.findById.mockResolvedValue(
        makeCourse({ status: CourseStatus.DRAFT }),
      );
      courseRepository.submitForReview.mockResolvedValue(null);

      await expect(
        service.submitDraftCourseForReview(instructorId, courseId),
      ).rejects.toThrow(
        'ONLY_DRAFT_OR_CHANGES_REQUESTED_COURSE_CAN_BE_SUBMITTED_FOR_REVIEW',
      );
    });
  });
});

function createCourseRepositoryMock(): CourseRepositoryMock {
  return {
    create: jest.fn(),
    createDraftCourse: jest.fn(),
    findById: jest.fn(),
    findActiveById: jest.fn(),
    findBySlug: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    updateDraftCourse: jest.fn(),
    submitForReview: jest.fn(),
    softDelete: jest.fn(),
    restore: jest.fn(),
    publish: jest.fn(),
    unpublish: jest.fn(),
    existsOwnedByInstructor: jest.fn(),
    existsBySlug: jest.fn(),
  };
}

function makeCourse(overrides: Partial<CourseModel> = {}): CourseModel {
  const now = new Date('2026-01-01T00:00:00.000Z');

  return {
    id: courseId,
    title: 'NestJS Masterclass',
    slug: 'nestjs-masterclass',
    shortDescription: 'Learn NestJS by building production APIs.',
    description: 'A complete NestJS course.',
    whatYouWillLearn: ['Build APIs'],
    requirements: ['TypeScript basics'],
    thumbnailUrl: 'https://example.com/thumb.jpg',
    cloudinaryPublicId: 'courses/thumb',
    level: CourseLevel.BEGINNER,
    status: CourseStatus.DRAFT,
    price: 49.99,
    language: 'en',
    durationInMinutes: 120,
    isActive: true,
    certificateEnabled: true,
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    categories: [
      {
        id: categoryId,
        name: 'Backend',
        slug: 'backend',
      },
    ],
    instructors: [
      {
        id: instructorId,
        fullName: 'Instructor One',
      },
    ],
    ...overrides,
  };
}

function makeCategory(overrides: Partial<Category> = {}): Category {
  const now = new Date('2026-01-01T00:00:00.000Z');

  return {
    id: categoryId,
    name: 'Backend',
    slug: 'backend',
    description: null,
    parentId: null,
    order: 1,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
}

function makeCreateCourseDto() {
  return {
    title: 'NestJS Masterclass',
    shortDescription: 'Learn how to build production-ready APIs.',
    description: 'A complete NestJS course.',
    whatYouWillLearn: ['Build APIs'],
    requirements: ['TypeScript basics'],
    level: CourseLevel.BEGINNER,
    price: 49.99,
    language: 'en',
    certificateEnabled: true,
    categoryIds: [categoryId],
  };
}

function makePrismaUniqueSlugError(): Prisma.PrismaClientKnownRequestError {
  return makePrismaUniqueError(['slug']);
}

function makePrismaUniqueError(
  target: string[],
): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test-client',
    meta: {
      target,
    },
  });
}
