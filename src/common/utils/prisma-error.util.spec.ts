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

import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PrismaErrorHandler } from './prisma-error.util';

describe('PrismaErrorHandler', () => {
  function createPrismaError(code: string, meta?: Record<string, unknown>) {
    return new Prisma.PrismaClientKnownRequestError('Prisma error', {
      code,
      clientVersion: 'test-client',
      meta,
    });
  }

  it('throws original error if error is not PrismaClientKnownRequestError', () => {
    const error = new Error('Normal error');

    expect(() => PrismaErrorHandler.handle(error)).toThrow(error);
  });

  it('handles P2002 with custom field message', () => {
    const error = createPrismaError('P2002', {
      target: ['slug'],
    });

    expect(() =>
      PrismaErrorHandler.handle(error, {
        entity: 'Category',
        fieldMsg: {
          slug: 'Category slug already exists',
        },
      }),
    ).toThrow(ConflictException);

    expect(() =>
      PrismaErrorHandler.handle(error, {
        entity: 'Category',
        fieldMsg: {
          slug: 'Category slug already exists',
        },
      }),
    ).toThrow('Category slug already exists');
  });

  it('handles P2002 with fallback message', () => {
    const error = createPrismaError('P2002', {
      target: ['name', 'slug'],
    });

    expect(() =>
      PrismaErrorHandler.handle(error, {
        entity: 'Category',
      }),
    ).toThrow(ConflictException);

    expect(() =>
      PrismaErrorHandler.handle(error, {
        entity: 'Category',
      }),
    ).toThrow('Category with this name+slug already exists');
  });

  it('handles P2002 without target', () => {
    const error = createPrismaError('P2002', {});

    expect(() =>
      PrismaErrorHandler.handle(error, {
        entity: 'Category',
      }),
    ).toThrow('Category already exists');
  });

  it('handles P2025 as NotFoundException', () => {
    const error = createPrismaError('P2025');

    expect(() =>
      PrismaErrorHandler.handle(error, {
        entity: 'Category',
      }),
    ).toThrow(NotFoundException);

    expect(() =>
      PrismaErrorHandler.handle(error, {
        entity: 'Category',
      }),
    ).toThrow('Category not found');
  });

  it('handles P2003 as BadRequestException', () => {
    const error = createPrismaError('P2003');

    expect(() =>
      PrismaErrorHandler.handle(error, {
        entity: 'Category',
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      PrismaErrorHandler.handle(error, {
        entity: 'Category',
      }),
    ).toThrow('Invalid reference in Category');
  });

  it.each(['P2014', 'P2016'])('handles %s as BadRequestException', (code) => {
    const error = createPrismaError(code);

    expect(() =>
      PrismaErrorHandler.handle(error, {
        entity: 'Category',
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      PrismaErrorHandler.handle(error, {
        entity: 'Category',
      }),
    ).toThrow('Invalid data for Category');
  });

  it('handles unknown Prisma error as BadRequestException', () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const error = createPrismaError('P9999');

    expect(() =>
      PrismaErrorHandler.handle(error, {
        entity: 'Category',
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      PrismaErrorHandler.handle(error, {
        entity: 'Category',
      }),
    ).toThrow('Database error occurred while processing Category');

    jest.restoreAllMocks();
  });
});
