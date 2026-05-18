import { Injectable } from '@nestjs/common';

import { Course, Prisma } from 'generated/prisma/client';

import { PrismaService } from 'src/core/database/prisma.service';

@Injectable()
export class CoursesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    where: Prisma.CourseWhereInput,
    take: number,
    skip: number,
    orderBy: Prisma.CourseOrderByWithRelationInput,
  ): Promise<Course[]> {
    const courses = await this.prisma.course.findMany({
      where,
      take,
      skip,
      orderBy,
    });
    return courses;
  }

  async count(where: Prisma.CourseWhereInput): Promise<number> {
    return this.prisma.course.count({
      where,
    });
  }
}
