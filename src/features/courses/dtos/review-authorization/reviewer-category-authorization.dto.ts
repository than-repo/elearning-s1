import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class ReplaceReviewerCategoryAuthorizationsDto {
  @ApiProperty({
    description:
      'Full replacement list of category IDs this reviewer is authorized to review. Use an empty array to revoke all.',
    example: ['550e8400-e29b-41d4-a716-446655440000'],
    type: [String],
  })
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  categoryIds!: string[];
}

export class ReviewerAuthorizedCategoryDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  name!: string;

  @ApiProperty()
  @Expose()
  slug!: string;
}

export class ReviewerCategoryAuthorizationsResponseDto {
  @ApiProperty()
  @Expose()
  reviewerId!: string;

  @ApiProperty({
    type: () => [ReviewerAuthorizedCategoryDto],
  })
  @Expose()
  @Type(() => ReviewerAuthorizedCategoryDto)
  categories!: ReviewerAuthorizedCategoryDto[];
}
