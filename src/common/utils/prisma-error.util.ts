import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
/*
 *   This helper throws prisma exception.
 */

export class PrismaErrorHandler {
  static handle(
    error: unknown,
    context?: {
      entity?: string;
      fieldMsg?: Record<string, string>;
    },
  ): never {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
      throw error;
    }

    const prismaError: Prisma.PrismaClientKnownRequestError = error;

    const { code, meta } = prismaError;
    const entity = context?.entity ?? 'Record';
    const fieldMsg = context?.fieldMsg ?? {};

    const target = meta?.target;
    switch (code) {
      case 'P2002': {
        if (!Array.isArray(target) || target.length === 0) {
          throw new ConflictException(`${entity} already exists`);
        }

        for (let field of target) {
          const msg = fieldMsg[field];
          if (msg) {
            throw new ConflictException(msg);
          }
        }
        //fallback
        throw new ConflictException(
          `${entity} with this ${target.join('+')} already exists`,
        );
      }
      case 'P2025': {
        throw new NotFoundException(`${entity} not found`);
      }
      case 'P2003':
        throw new BadRequestException(`Invalid reference in ${entity}`);

      case 'P2014':
      case 'P2016':
        throw new BadRequestException(`Invalid data for ${entity}`);

      default:
        console.error(
          `[Prisma] Unhandled error code ${code} for ${entity}:`,
          prismaError,
        );
        throw new BadRequestException(
          `Database error occurred while processing ${entity}`,
        );
    }
  }
}
