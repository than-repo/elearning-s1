import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import {
  CourseLevel,
  EnrollmentStatus,
  PaymentMethod,
  PaymentStatus,
} from 'generated/prisma/enums';
import { PaginationMetaDto } from '../../courses/dtos/paginated-response.dto';

export class EnrollmentCourseSummaryDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  title!: string;

  @ApiProperty()
  @Expose()
  slug!: string;

  @ApiProperty()
  @Expose()
  shortDescription!: string;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  thumbnailUrl?: string | null;

  @ApiProperty({ enum: CourseLevel })
  @Expose()
  level!: CourseLevel;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  price?: number | null;
}

export class PaymentSummaryDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  amount!: number;

  @ApiProperty()
  @Expose()
  currency!: string;

  @ApiProperty({ enum: PaymentMethod })
  @Expose()
  paymentMethod!: PaymentMethod;

  @ApiProperty({ enum: PaymentStatus })
  @Expose()
  status!: PaymentStatus;

  @ApiProperty()
  @Expose()
  createdAt!: Date;
}

export class EnrollmentResponseDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  courseId!: string;

  @ApiProperty({ enum: EnrollmentStatus })
  @Expose()
  status!: EnrollmentStatus;

  @ApiProperty()
  @Expose()
  progressPercentage!: number;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  enrolledAt?: Date | null;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  completedAt?: Date | null;

  @ApiProperty()
  @Expose()
  createdAt!: Date;

  @ApiPropertyOptional({ type: () => EnrollmentCourseSummaryDto })
  @Expose()
  @Type(() => EnrollmentCourseSummaryDto)
  course?: EnrollmentCourseSummaryDto;

  @ApiPropertyOptional({ type: () => PaymentSummaryDto, nullable: true })
  @Expose()
  @Type(() => PaymentSummaryDto)
  payment?: PaymentSummaryDto | null;
}

export class EnrollmentStatusResponseDto {
  @ApiProperty()
  @Expose()
  enrolled!: boolean;

  @ApiPropertyOptional({ type: () => EnrollmentResponseDto, nullable: true })
  @Expose()
  @Type(() => EnrollmentResponseDto)
  enrollment?: EnrollmentResponseDto | null;
}

export class PaginatedEnrollmentResponseDto {
  @ApiProperty({ type: () => [EnrollmentResponseDto] })
  data!: EnrollmentResponseDto[];

  @ApiProperty({ type: () => PaginationMetaDto })
  meta!: PaginationMetaDto;
}
