// src/features/courses/dtos/section-lesson/reorder-sections.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsUUID,
} from 'class-validator';

export class ReorderSectionsDto {
  @ApiProperty({
    description:
      'Ordered list of section IDs. The array order will become the new section order.',
    example: [
      '4d2b8f91-6f5a-4e3a-91b7-8f9c4a2d5e10',
      '92a8f5d4-51b6-4f7d-8b7f-314f90d4c123',
      'bb37d0a6-36c4-41f4-92a6-3a2f54b2e987',
    ],
    type: [String],
  })
  @IsArray()
  @ArrayUnique()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  sectionIds!: string[];
}
