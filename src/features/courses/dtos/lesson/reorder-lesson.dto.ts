// src/features/courses/dtos/lesson/reorder-lessons.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsUUID,
} from 'class-validator';

export class ReorderLessonsDto {
  @ApiProperty({
    example: [
      '7c0a2ad5-bdb7-4c1f-8f3e-4183a248d842',
      '3b2b5cf8-66db-44b3-9e69-3e771ceca39e',
      'a789f6c2-77b1-49f4-a688-29d548308f61',
    ],
    description:
      'Ordered list of lesson IDs. The first ID will receive lessonIndex = 0.',
    type: [String],
  })
  @IsNotEmpty()
  @IsArray()
  @ArrayUnique()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  lessonIds!: string[];
}
