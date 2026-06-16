import {
  CourseLevel,
  EnrollmentStatus,
  PaymentMethod,
  PaymentStatus,
} from 'generated/prisma/enums';

export interface ActivateEnrollmentByPaymentInput {
  userId: string;
  courseId: string;
  paymentId: string;
}

export interface EnrollmentCourseModel {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  thumbnailUrl: string | null;
  level: CourseLevel;
  price: number | null;
}

export interface PaymentModel {
  id: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  createdAt: Date;
}

export interface EnrollmentModel {
  id: string;
  userId: string;
  courseId: string;
  paymentId: string | null;
  status: EnrollmentStatus;
  progressPercentage: number;
  enrolledAt: Date | null;
  completedAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  course?: EnrollmentCourseModel;
  payment?: PaymentModel | null;
}

export interface EnrollableCourseModel {
  id: string;
  price: number | null;
}

export interface CompletedPaymentInput {
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  provider: string;
}

export interface EnrollLearnerInput {
  courseId: string;
  payment?: CompletedPaymentInput;
  userId: string;
}

export interface FindMyEnrollmentsParams {
  limit: number;
  offset: number;
  userId: string;
}

export interface IEnrollmentRepository {
  findEnrollableCourseById(
    courseId: string,
  ): Promise<EnrollableCourseModel | null>;

  enrollLearner(input: EnrollLearnerInput): Promise<EnrollmentModel>;

  findByUserAndCourse(
    userId: string,
    courseId: string,
  ): Promise<EnrollmentModel | null>;

  activateByPaidPayment(
    input: ActivateEnrollmentByPaymentInput,
  ): Promise<EnrollmentModel>;

  findManyByUser(params: FindMyEnrollmentsParams): Promise<EnrollmentModel[]>;

  countByUser(userId: string): Promise<number>;
}
