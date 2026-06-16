import { Prisma } from 'generated/prisma/client';
import {
  CourseForLearningModel,
  ILearningCourseRepository,
} from '../interfaces/learning-course.repository.interface';

import { PrismaService } from 'src/core/database/prisma.service';
import { Injectable } from '@nestjs/common';
import { CourseStatus } from 'generated/prisma/enums';

const courseIncludeForLearning = {
  sections: {
    where: {
      isActive: true,
      deletedAt: null,
    },
    orderBy: {
      sectionIndex: 'asc',
    },
    include: {
      lessons: {
        where: {
          isActive: true,
          deletedAt: null,
        },
        orderBy: {
          lessonIndex: 'asc',
        },
        include: {
          files: {
            where: {
              deletedAt: null,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.CourseInclude;

type PrismaCourseForLearning = Prisma.CourseGetPayload<{
  include: typeof courseIncludeForLearning;
}>;

@Injectable()
export class LearningCourseRepository implements ILearningCourseRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toCourseForLearningModel(
    course: PrismaCourseForLearning,
  ): CourseForLearningModel {
    return {
      id: course.id,
      title: course.title,
      slug: course.slug,
      shortDescription: course.shortDescription,
      thumbnailUrl: course.thumbnailUrl,
      sections: course.sections.map((section) => ({
        id: section.id,
        title: section.title,
        description: section.description,
        sectionIndex: section.sectionIndex,

        lessons: section.lessons.map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          description: lesson.description,
          lessonIndex: lesson.lessonIndex,

          files: lesson.files.map((file) => ({
            id: file.id,
            url: file.url,
            type: file.type,
          })),
        })),
      })),
    };
  }
  async findCourseForLearning(
    courseId: string,
  ): Promise<CourseForLearningModel | null> {
    const course = await this.prisma.course.findFirst({
      where: {
        id: courseId,
        deletedAt: null,
        isActive: true,
        status: CourseStatus.PUBLISHED,
      },
      include: courseIncludeForLearning,
    });

    if (!course) {
      return null;
    }
    return this.toCourseForLearningModel(course);
  }
}
