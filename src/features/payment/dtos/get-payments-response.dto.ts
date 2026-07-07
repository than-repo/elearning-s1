import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Min,
} from 'class-validator';
import {
  PaymentMethod,
  PaymentStatus,
} from '../interfaces/payment.repository.interface';

export class LearnerPaymentCourseDto {
  @ApiProperty({
    example: '7c2f1b6e-8c91-4c2e-a7f3-2b7df7c4e8a1',
  })
  @Expose()
  @IsUUID()
  @IsNotEmpty()
  id!: string;

  @ApiProperty({
    example: 'NestJS Backend Development',
  })
  @Expose()
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({
    example: 'nestjs-backend-development',
  })
  @Expose()
  @IsString()
  @IsNotEmpty()
  slug!: string;
}

export class LearnerPaymentItemDto {
  @ApiProperty({
    example: '9cb9fbe7-1a2b-4c81-a13e-03e6b1457d11',
  })
  @Expose()
  @IsUUID()
  @IsNotEmpty()
  id!: string;

  @ApiProperty({
    example: 499000,
  })
  @Expose()
  @IsInt()
  @Min(0)
  @IsNotEmpty()
  amount!: number;

  @ApiProperty({
    example: 'VND',
  })
  @Expose()
  @IsString()
  @IsNotEmpty()
  currency!: string;

  @ApiProperty({
    enum: PaymentMethod,
    example: PaymentMethod.VNPAY,
  })
  @Expose()
  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  paymentMethod!: PaymentMethod;

  @ApiProperty({
    enum: PaymentStatus,
    example: PaymentStatus.PAID,
  })
  @Expose()
  @IsEnum(PaymentStatus)
  @IsNotEmpty()
  status!: PaymentStatus;

  @ApiPropertyOptional({
    example: '2026-07-07T10:35:00.000Z',
    nullable: true,
  })
  @Expose()
  @Type(() => Date)
  @IsOptional()
  @IsDate()
  paidAt?: Date | null;

  @ApiProperty({
    example: '2026-07-07T10:30:00.000Z',
  })
  @Expose()
  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  createdAt!: Date;

  @ApiProperty({
    type: () => LearnerPaymentCourseDto,
  })
  @Expose()
  @Type(() => LearnerPaymentCourseDto)
  @IsNotEmpty()
  course!: LearnerPaymentCourseDto;
}

export class GetPaymentsResponseDto {
  @ApiProperty({
    type: () => [LearnerPaymentItemDto],
  })
  @Expose()
  @Type(() => LearnerPaymentItemDto)
  @IsNotEmpty()
  payments!: LearnerPaymentItemDto[];
}
