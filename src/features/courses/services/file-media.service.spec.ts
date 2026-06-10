jest.mock(
  'generated/prisma/enums',
  () => ({
    MediaTypeEnum: {
      VIDEO: 'VIDEO',
      DOCUMENT: 'DOCUMENT',
      IMAGE: 'IMAGE',
      AUDIO: 'AUDIO',
      OTHER: 'OTHER',
    },
  }),
  { virtual: true },
);

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MediaTypeEnum } from 'generated/prisma/enums';

import type {
  FileMedia,
  IFileMediaRepository,
} from '../interfaces/file-media.repository.interface';
import { FILE_MEDIA_REPOSITORY } from '../repositories/file-media.repository.token';
import { CourseAccessService } from './course-access.service';
import { FileMediaService } from './file-media.service';

type FileMediaRepositoryMock = jest.Mocked<IFileMediaRepository>;
type CourseAccessServiceMock = jest.Mocked<
  Pick<CourseAccessService, 'ensureInstructorCanManageLesson'>
>;

const courseId = '11111111-1111-4111-8111-111111111111';
const sectionId = '22222222-2222-4222-8222-222222222222';
const lessonId = '33333333-3333-4333-8333-333333333333';
const fileMediaId = '44444444-4444-4444-8444-444444444444';
const instructorId = '55555555-5555-4555-8555-555555555555';

describe('FileMediaService', () => {
  let service: FileMediaService;
  let fileMediaRepository: FileMediaRepositoryMock;
  let courseAccessService: CourseAccessServiceMock;

  beforeEach(async () => {
    fileMediaRepository = createFileMediaRepositoryMock();
    courseAccessService = {
      ensureInstructorCanManageLesson: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileMediaService,
        {
          provide: FILE_MEDIA_REPOSITORY,
          useValue: fileMediaRepository,
        },
        {
          provide: CourseAccessService,
          useValue: courseAccessService,
        },
      ],
    }).compile();

    service = module.get(FileMediaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates file media after checking instructor lesson access', async () => {
    const fileMedia = makeFileMedia();
    fileMediaRepository.create.mockResolvedValue(fileMedia);

    const result = await service.createFileMedia(
      courseId,
      sectionId,
      lessonId,
      instructorId,
      {
        cloudinaryPublicId: fileMedia.cloudinaryPublicId,
        url: fileMedia.url,
        type: fileMedia.type,
        filename: fileMedia.filename,
        mimeType: fileMedia.mimeType,
        sizeInBytes: fileMedia.sizeInBytes,
      },
    );

    expect(
      courseAccessService.ensureInstructorCanManageLesson,
    ).toHaveBeenCalledWith(courseId, instructorId, sectionId, lessonId);
    expect(fileMediaRepository.create).toHaveBeenCalledWith({
      lessonId,
      cloudinaryPublicId: fileMedia.cloudinaryPublicId,
      url: fileMedia.url,
      type: fileMedia.type,
      filename: fileMedia.filename,
      mimeType: fileMedia.mimeType,
      sizeInBytes: fileMedia.sizeInBytes,
    });
    expect(result).toMatchObject({
      id: fileMediaId,
      lessonId,
      url: fileMedia.url,
      type: MediaTypeEnum.VIDEO,
    });
    expect(result).not.toHaveProperty('deletedAt');
  });

  it('lists lesson file media with pagination metadata', async () => {
    fileMediaRepository.findMany.mockResolvedValue([makeFileMedia()]);
    fileMediaRepository.count.mockResolvedValue(11);

    const result = await service.getFileMediaList(
      courseId,
      sectionId,
      lessonId,
      instructorId,
      {
        search: 'intro',
        type: MediaTypeEnum.VIDEO,
        mimeType: 'video/mp4',
        page: 2,
        limit: 10,
      },
    );

    expect(fileMediaRepository.findMany).toHaveBeenCalledWith({
      where: {
        lessonId,
        filenameContains: 'intro',
        type: MediaTypeEnum.VIDEO,
        mimeType: 'video/mp4',
      },
      orderBy: {
        field: 'createdAt',
        direction: 'desc',
      },
      limit: 10,
      offset: 10,
    });
    expect(fileMediaRepository.count).toHaveBeenCalledWith({
      where: {
        lessonId,
        filenameContains: 'intro',
        type: MediaTypeEnum.VIDEO,
        mimeType: 'video/mp4',
      },
    });
    expect(result.meta).toEqual({
      page: 2,
      limit: 10,
      total: 11,
      totalPages: 2,
      hasNextPage: false,
      hasPreviousPage: true,
    });
  });

  it('throws when reading a file media outside the lesson scope', async () => {
    fileMediaRepository.findByIdInLesson.mockResolvedValue(null);

    await expect(
      service.getFileMedia(
        courseId,
        sectionId,
        lessonId,
        fileMediaId,
        instructorId,
      ),
    ).rejects.toThrow(NotFoundException);
    expect(fileMediaRepository.findByIdInLesson).toHaveBeenCalledWith(
      fileMediaId,
      lessonId,
    );
  });

  it('rejects empty updates', async () => {
    await expect(
      service.updateFileMedia(
        courseId,
        sectionId,
        lessonId,
        fileMediaId,
        instructorId,
        {},
      ),
    ).rejects.toThrow(BadRequestException);
    expect(fileMediaRepository.updateInLesson).not.toHaveBeenCalled();
  });

  it('throws when updating a file media outside the lesson scope', async () => {
    fileMediaRepository.updateInLesson.mockResolvedValue(null);

    await expect(
      service.updateFileMedia(
        courseId,
        sectionId,
        lessonId,
        fileMediaId,
        instructorId,
        { filename: 'updated.mp4' },
      ),
    ).rejects.toThrow(NotFoundException);
    expect(fileMediaRepository.updateInLesson).toHaveBeenCalledWith(
      fileMediaId,
      lessonId,
      { filename: 'updated.mp4' },
    );
  });

  it('soft deletes file media inside the lesson scope', async () => {
    fileMediaRepository.softDeleteInLesson.mockResolvedValue(true);

    await expect(
      service.deleteFileMedia(
        courseId,
        sectionId,
        lessonId,
        fileMediaId,
        instructorId,
      ),
    ).resolves.toBeUndefined();
    expect(fileMediaRepository.softDeleteInLesson).toHaveBeenCalledWith(
      fileMediaId,
      lessonId,
    );
  });

  it('throws when deleting a file media outside the lesson scope', async () => {
    fileMediaRepository.softDeleteInLesson.mockResolvedValue(false);

    await expect(
      service.deleteFileMedia(
        courseId,
        sectionId,
        lessonId,
        fileMediaId,
        instructorId,
      ),
    ).rejects.toThrow(NotFoundException);
  });
});

function createFileMediaRepositoryMock(): FileMediaRepositoryMock {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByIdInLesson: jest.fn(),
    update: jest.fn(),
    updateInLesson: jest.fn(),
    delete: jest.fn(),
    softDeleteInLesson: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    findByLessonId: jest.fn(),
    existsInLesson: jest.fn(),
    findByCloudinaryPublicId: jest.fn(),
  };
}

function makeFileMedia(overrides: Partial<FileMedia> = {}): FileMedia {
  const now = new Date('2026-06-10T00:00:00.000Z');

  return {
    id: fileMediaId,
    lessonId,
    cloudinaryPublicId: 'elearning/lessons/lesson-123/videos/intro',
    url: 'https://res.cloudinary.com/demo/video/upload/v123/intro.mp4',
    type: MediaTypeEnum.VIDEO,
    filename: 'intro.mp4',
    mimeType: 'video/mp4',
    sizeInBytes: 10485760,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
}
