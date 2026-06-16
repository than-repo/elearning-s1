// src/features/learning/interfaces/learning-course.repository.interface.ts

export type CourseLevelModel =
  | 'BEGINNER'
  | 'INTERMEDIATE'
  | 'ADVANCE'
  | 'ALL_LEVELS';

export type CourseStatusModel =
  | 'DRAFT'
  | 'PUBLISHED'
  | 'ARCHIVED'
  | 'IN_REVIEW'
  | 'CHANGES_REQUESTED';

export type MediaTypeModel = 'VIDEO' | 'DOCUMENT' | 'IMAGE' | 'AUDIO' | 'OTHER';

export interface CourseForLearningModel {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  thumbnailUrl: string | null;
  sections: CourseSectionForLearningModel[];
}

export interface CourseSectionForLearningModel {
  id: string;
  title: string;
  description: string | null;
  sectionIndex: number;

  lessons: LessonForLearningModel[];
}

export interface LessonForLearningModel {
  id: string;
  title: string;
  description: string | null;
  lessonIndex: number;

  files: FileMediaForLearningModel[];
}

export interface FileMediaForLearningModel {
  id: string;
  url: string;
  type: MediaTypeModel;
}

export interface ILearningCourseRepository {
  findCourseForLearning(
    courseId: string,
  ): Promise<CourseForLearningModel | null>;
}
