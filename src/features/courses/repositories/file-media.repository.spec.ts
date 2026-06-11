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

jest.mock(
  'src/core/database/prisma.service',
  () => ({
    PrismaService: class PrismaService {},
  }),
  { virtual: true },
);

import { MediaTypeEnum } from 'generated/prisma/enums';

import { FileMediaRepository } from './file-media.repository';

type FileMediaDelegateMock = {
  create: jest.Mock;
  findFirst: jest.Mock;
  findMany: jest.Mock;
  update: jest.Mock;
  updateMany: jest.Mock;
  delete: jest.Mock;
  count: jest.Mock;
};

type TransactionClientMock = {
  fileMedia: Pick<FileMediaDelegateMock, 'updateMany' | 'findFirst'>;
};

type PrismaServiceMock = {
  fileMedia: FileMediaDelegateMock;
  $transaction: jest.Mock;
};

const lessonId = '33333333-3333-4333-8333-333333333333';
const fileMediaId = '44444444-4444-4444-8444-444444444444';

describe('FileMediaRepository', () => {
  let repository: FileMediaRepository;
  let prisma: PrismaServiceMock;
  let tx: TransactionClientMock;

  beforeEach(() => {
    tx = {
      fileMedia: {
        updateMany: jest.fn(),
        findFirst: jest.fn(),
      },
    };
    prisma = {
      fileMedia: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn(
        (callback: (client: TransactionClientMock) => unknown) => callback(tx),
      ),
    };

    repository = new FileMediaRepository(
      prisma as unknown as ConstructorParameters<typeof FileMediaRepository>[0],
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('findMany excludes soft-deleted file media by default', async () => {
    prisma.fileMedia.findMany.mockResolvedValue([makePrismaFileMedia()]);

    const result = await repository.findMany({
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
      limit: 20,
      offset: 40,
    });

    expect(prisma.fileMedia.findMany).toHaveBeenCalledWith({
      where: {
        lessonId,
        type: MediaTypeEnum.VIDEO,
        filename: {
          contains: 'intro',
        },
        mimeType: 'video/mp4',
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: 40,
      take: 20,
    });
    expect(result[0]).toEqual(
      expect.objectContaining({
        id: fileMediaId,
        lessonId,
        deletedAt: null,
      }),
    );
  });

  it('count excludes soft-deleted file media by default', async () => {
    prisma.fileMedia.count.mockResolvedValue(2);

    const result = await repository.count({
      where: {
        lessonId,
      },
    });

    expect(prisma.fileMedia.count).toHaveBeenCalledWith({
      where: {
        lessonId,
        deletedAt: null,
      },
    });
    expect(result).toBe(2);
  });

  it('updateInLesson returns null when no active matching file media exists', async () => {
    tx.fileMedia.updateMany.mockResolvedValue({ count: 0 });

    const result = await repository.updateInLesson(fileMediaId, lessonId, {
      filename: 'updated.mp4',
    });

    expect(tx.fileMedia.updateMany).toHaveBeenCalledWith({
      where: {
        id: fileMediaId,
        lessonId,
        deletedAt: null,
      },
      data: {
        filename: 'updated.mp4',
      },
    });
    expect(tx.fileMedia.findFirst).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('updateInLesson reloads and maps the updated active file media', async () => {
    tx.fileMedia.updateMany.mockResolvedValue({ count: 1 });
    tx.fileMedia.findFirst.mockResolvedValue(
      makePrismaFileMedia({ filename: 'updated.mp4' }),
    );

    const result = await repository.updateInLesson(fileMediaId, lessonId, {
      filename: 'updated.mp4',
    });

    expect(tx.fileMedia.findFirst).toHaveBeenCalledWith({
      where: {
        id: fileMediaId,
        lessonId,
        deletedAt: null,
      },
    });
    expect(result?.filename).toBe('updated.mp4');
  });

  it('softDeleteInLesson marks deletedAt instead of deleting the row', async () => {
    prisma.fileMedia.updateMany.mockResolvedValue({ count: 1 });

    const result = await repository.softDeleteInLesson(fileMediaId, lessonId);

    expect(prisma.fileMedia.updateMany).toHaveBeenCalledWith({
      where: {
        id: fileMediaId,
        lessonId,
        deletedAt: null,
      },
      data: {
        deletedAt: expect.any(Date),
      },
    });
    expect(prisma.fileMedia.delete).not.toHaveBeenCalled();
    expect(result).toBe(true);
  });
});

function makePrismaFileMedia(overrides: Record<string, unknown> = {}) {
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
