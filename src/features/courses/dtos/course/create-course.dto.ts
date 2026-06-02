import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CourseLevel } from 'generated/prisma/enums';
export class CreateCourseDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(500)
  shortDescription!: string;

  @IsString()
  @IsOptional()
  @MaxLength(10000)
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  whatYouWillLearn?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  requirements?: string[];

  @IsEnum(CourseLevel)
  level!: CourseLevel;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  price?: number;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  language?: string;

  @IsBoolean()
  @IsOptional()
  certificateEnabled?: boolean;
}
