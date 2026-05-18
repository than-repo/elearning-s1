import { Injectable } from '@nestjs/common';
import { CoursesRepository } from '../repositories/courses.repository';
import { LearnerGetCoursesQueryDto } from '../dtos/learner-get-courses.query.dto.ts';

import { GetCoursesResponseDto } from '../dtos/get-courses.response.dto';
import { Course, Prisma } from 'generated/prisma/client';

@Injectable()
export class CoursesService {
  constructor(private readonly coursesRepository: CoursesRepository) {}
  private buildWhereInput(query: any): Prisma.CourseWhereInput {
    const where: Prisma.CourseWhereInput = {};
    const {
      search,
      level,
      minPrice,
      maxPrice,
      // base
      status,
      isActive,
      instructorId,
    } = query;
    //Based condition
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { shortDescription: { contains: search } },
      ];
    }
    if (level) {
      where.level = level;
    }
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }

    if (status) {
      where.status = status;
    }
    if (isActive !== undefined) {
      where.isActive = isActive;
    }
    if (instructorId !== undefined) {
      where.instructors = { some: { instructorId } }; ///Note
    }
    return where;
  }
  async findManyForLearner(
    query: LearnerGetCoursesQueryDto,
  ): Promise<GetCoursesResponseDto<Course>> {
    //Learner only can find actived coruses.

    const where: Prisma.CourseWhereInput = this.buildWhereInput({
      ...query,
      isActive: true,
      status: 'PUBLISHED',
    });
    const { limit, page, sortBy, sortOrder } = query;
    const take = limit;
    const skip = (page - 1) * limit;
    const orderBy: Prisma.CourseOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };
    const courses = await this.coursesRepository.findMany(
      where,
      take,
      skip,
      orderBy,
    );

    const total = await this.coursesRepository.count(where);
    const totalPage = Math.ceil(total / limit);
    return {
      data: courses,
      meta: {
        page,
        limit,
        total,
        totalPage,
        hasNext: page < totalPage,
        hasPrev: page > 1,
      },
    };
  }
}
