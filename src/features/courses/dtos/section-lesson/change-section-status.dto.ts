// src/features/courses/dtos/section-lesson/change-section-status.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class ChangeSectionStatusDto {
  @ApiProperty({
    description: 'Whether this section is active.',
    example: true,
  })
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsNotEmpty()
  @IsBoolean()
  isActive!: boolean;
}
