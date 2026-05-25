// src/common/filters/prisma-client-exception.filter.spec.ts

jest.mock('@prisma/client');

import { Prisma } from '@prisma/client';
import { PrismaClientExceptionFilter } from './prisma-client-exception.filter';
import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Response } from 'express';

describe('PrismaClientExceptionFilter', () => {
  let filter: PrismaClientExceptionFilter;
  let response: jest.Mocked<Response>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [PrismaClientExceptionFilter],
    }).compile();

    filter = module.get(PrismaClientExceptionFilter);

    response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any;
  });

  const mockHost = (exception: any) => ({
    switchToHttp: () => ({
      getResponse: () => response,
    }),
  });

  it('should handle P2025 (not found) correctly', () => {
    const prismaError = {
      code: 'P2025',
      meta: {
        modelName: 'Category',
        where: { id: '123' },
      },
    } as Prisma.PrismaClientKnownRequestError;

    filter.catch(prismaError, mockHost(prismaError) as any);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.NOT_FOUND,
      message: 'Category with id "123" not found',
      error: 'Not Found',
    });
  });

  it('should handle P2002 (unique constraint) correctly', () => {
    const prismaError = {
      code: 'P2002',
      meta: {
        modelName: 'Category',
        target: ['slug'],
      },
    } as Prisma.PrismaClientKnownRequestError;

    filter.catch(prismaError, mockHost(prismaError) as any);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.CONFLICT,
      message: 'Category with this slug already exists',
      error: 'Conflict',
    });
  });

  it('should fallback to "Record" when modelName is missing', () => {
    const prismaError = {
      code: 'P2025',
      meta: { where: { id: 'abc' } },
    } as Prisma.PrismaClientKnownRequestError;

    filter.catch(prismaError, mockHost(prismaError) as any);

    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Record with id "abc" not found',
      }),
    );
  });
});
