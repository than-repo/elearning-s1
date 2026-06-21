//src\features\assessments\interfaces\assessment-access.repository.interface.ts

export interface IAssessmentAccessRepository {
  existsCourseByInstructor(
    courseId: string,
    instructorId: string,
  ): Promise<boolean>;

  existsAssessmentInCourse(
    assessmentId: string,
    courseId: string,
  ): Promise<boolean>;

  existsQuestionInAssessment(
    questionId: string,
    assessmentId: string,
  ): Promise<boolean>;

  existsAnswerInQuestion(
    answerId: string,
    questionId: string,
  ): Promise<boolean>;
}
