// src/filters/prisma-client-exception.filter.spec.ts
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
import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { PrismaClientExceptionFilter } from './prisma-client-exception.filter';

import { Prisma } from 'generated/prisma/client';

describe('PrismaClientExceptionFilter', () => {
  let filter: PrismaClientExceptionFilter;

  const jsonMock = jest.fn();
  const statusMock = jest.fn().mockReturnValue({ json: jsonMock });

  const mockHost = {
    switchToHttp: jest.fn().mockReturnValue({
      getResponse: jest.fn().mockReturnValue({
        status: statusMock,
      }),
      getRequest: jest.fn().mockReturnValue({
        url: '/test-url',
      }),
    }),
  } as unknown as ArgumentsHost;

  const createPrismaError = (
    code: string,
    meta?: Record<string, unknown>,
  ): Prisma.PrismaClientKnownRequestError => {
    return new Prisma.PrismaClientKnownRequestError('Prisma error', {
      code,
      clientVersion: 'test-version',
      meta,
    });
  };

  beforeEach(() => {
    filter = new PrismaClientExceptionFilter();
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  it('should return 404 when Prisma error is P2025 with id', () => {
    const exception = createPrismaError('P2025', {
      modelName: 'Category',
      where: { id: 'cat-1' },
    });

    filter.catch(exception, mockHost);

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(jsonMock).toHaveBeenCalledWith({
      statusCode: HttpStatus.NOT_FOUND,
      message: 'Category with id "cat-1" not found',
      error: 'Not Found',
    });
  });

  it('should return 404 when Prisma error is P2025 without id', () => {
    const exception = createPrismaError('P2025', {
      modelName: 'Course',
    });

    filter.catch(exception, mockHost);

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(jsonMock).toHaveBeenCalledWith({
      statusCode: HttpStatus.NOT_FOUND,
      message: 'Course not found',
      error: 'Not Found',
    });
  });

  it('should return 404 when Prisma error is P2025 with where array', () => {
    const exception = createPrismaError('P2025', {
      modelName: 'Course',
      where: [{ id: 'course-1' }],
    });

    filter.catch(exception, mockHost);

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(jsonMock).toHaveBeenCalledWith({
      statusCode: HttpStatus.NOT_FOUND,
      message: 'Course with id "course-1" not found',
      error: 'Not Found',
    });
  });

  it('should return 409 when Prisma error is P2002', () => {
    const exception = createPrismaError('P2002', {
      modelName: 'Category',
      target: ['slug'],
    });

    filter.catch(exception, mockHost);

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(jsonMock).toHaveBeenCalledWith({
      statusCode: HttpStatus.CONFLICT,
      message: 'Category with this slug already exists',
      error: 'Conflict',
    });
  });

  it('should return 409 when Prisma error is P2002 without target', () => {
    const exception = createPrismaError('P2002', {
      modelName: 'Category',
    });

    filter.catch(exception, mockHost);

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(jsonMock).toHaveBeenCalledWith({
      statusCode: HttpStatus.CONFLICT,
      message: 'Category with this field already exists',
      error: 'Conflict',
    });
  });

  it('should return 400 when Prisma error is P2003', () => {
    const exception = createPrismaError('P2003', {
      modelName: 'Category',
    });

    filter.catch(exception, mockHost);

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(jsonMock).toHaveBeenCalledWith({
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Invalid reference in Category',
      error: 'Bad Request',
    });
  });

  it('should return 400 when Prisma error is P2014', () => {
    const exception = createPrismaError('P2014', {
      modelName: 'Course',
    });

    filter.catch(exception, mockHost);

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(jsonMock).toHaveBeenCalledWith({
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Invalid data for Course',
      error: 'Bad Request',
    });
  });

  it('should return 400 when Prisma error is P2016', () => {
    const exception = createPrismaError('P2016', {
      modelName: 'Course',
    });

    filter.catch(exception, mockHost);

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(jsonMock).toHaveBeenCalledWith({
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Invalid data for Course',
      error: 'Bad Request',
    });
  });

  it('should return 500 for unknown Prisma error code', () => {
    const exception = createPrismaError('P9999', {
      modelName: 'Course',
    });

    filter.catch(exception, mockHost);

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(jsonMock).toHaveBeenCalledWith({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Database error occurred while processing Course',
      error: 'Bad Request',
    });
  });

  it('should use Record as default entity when modelName is missing', () => {
    const exception = createPrismaError('P2003');

    filter.catch(exception, mockHost);

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(jsonMock).toHaveBeenCalledWith({
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Invalid reference in Record',
      error: 'Bad Request',
    });
  });
});
