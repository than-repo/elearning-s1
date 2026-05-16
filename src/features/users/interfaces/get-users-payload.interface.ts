import { Prisma } from 'generated/prisma/client';

export interface GetUsersPayload {
  skip: number;
  take: number;
  where: Prisma.UserWhereInput;
  orderBy: Prisma.UserOrderByWithRelationInput;
}

export interface ResultGetUserPayload {
  users: any;
  total: number;
}
