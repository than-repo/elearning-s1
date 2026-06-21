import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { AssessmentStatus, AssessmentType } from 'generated/prisma/enums';

export const ASSESSMENT_VIEW_GROUPS = {
  LEARNER: 'assessment:learner',
  INSTRUCTOR: 'assessment:instructor',
} as const;

export type AssessmentViewGroup =
  (typeof ASSESSMENT_VIEW_GROUPS)[keyof typeof ASSESSMENT_VIEW_GROUPS];

const ALL_ASSESSMENT_GROUPS = [
  ASSESSMENT_VIEW_GROUPS.LEARNER,
  ASSESSMENT_VIEW_GROUPS.INSTRUCTOR,
];

const INSTRUCTOR_ASSESSMENT_GROUPS = [ASSESSMENT_VIEW_GROUPS.INSTRUCTOR];

export class AssessmentResponseDto {
  @ApiProperty()
  @Expose({ groups: ALL_ASSESSMENT_GROUPS })
  id!: string;

  @ApiProperty()
  @Expose({ groups: ALL_ASSESSMENT_GROUPS })
  courseId!: string;

  @ApiProperty()
  @Expose({ groups: ALL_ASSESSMENT_GROUPS })
  title!: string;

  @ApiPropertyOptional({ nullable: true })
  @Expose({ groups: ALL_ASSESSMENT_GROUPS })
  description?: string | null;

  @ApiProperty({ enum: AssessmentType })
  @Expose({ groups: ALL_ASSESSMENT_GROUPS })
  type!: AssessmentType;

  @ApiProperty()
  @Expose({ groups: ALL_ASSESSMENT_GROUPS })
  order!: number;

  @ApiProperty()
  @Expose({ groups: ALL_ASSESSMENT_GROUPS })
  totalPoints!: number;

  @ApiPropertyOptional({ nullable: true })
  @Expose({ groups: ALL_ASSESSMENT_GROUPS })
  passingScore?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @Expose({ groups: ALL_ASSESSMENT_GROUPS })
  maxAttempts?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @Expose({ groups: ALL_ASSESSMENT_GROUPS })
  timeLimitMinutes?: number | null;

  @ApiPropertyOptional({
    nullable: true,
    type: String,
    format: 'date-time',
  })
  @Expose({ groups: ALL_ASSESSMENT_GROUPS })
  availableFrom?: Date | null;

  @ApiPropertyOptional({
    nullable: true,
    type: String,
    format: 'date-time',
  })
  @Expose({ groups: ALL_ASSESSMENT_GROUPS })
  availableUntil?: Date | null;

  @ApiProperty({ enum: AssessmentStatus })
  @Expose({ groups: INSTRUCTOR_ASSESSMENT_GROUPS })
  status!: AssessmentStatus;

  @ApiProperty()
  @Expose({ groups: INSTRUCTOR_ASSESSMENT_GROUPS })
  isActive!: boolean;

  @ApiProperty({
    type: String,
    format: 'date-time',
  })
  @Expose({ groups: INSTRUCTOR_ASSESSMENT_GROUPS })
  createdAt!: Date;

  @ApiProperty({
    type: String,
    format: 'date-time',
  })
  @Expose({ groups: INSTRUCTOR_ASSESSMENT_GROUPS })
  updatedAt!: Date;

  @ApiPropertyOptional({
    nullable: true,
    type: String,
    format: 'date-time',
  })
  @Expose({ groups: INSTRUCTOR_ASSESSMENT_GROUPS })
  deletedAt?: Date | null;
}
