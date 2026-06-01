import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CourseLevel, CourseStatus } from 'generated/prisma/enums';

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  title!: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  slug?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(500)
  shortDescription!: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  whatYouWillLearn?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  requirements?: string[];

  @IsString()
  @IsOptional()
  thumbnailUrl?: string;

  @IsString()
  @IsOptional()
  cloudinaryPublicId?: string;

  @IsEnum(CourseLevel)
  level!: CourseLevel;

  @IsEnum(CourseStatus)
  @IsOptional()
  status?: CourseStatus;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  price?: number;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  language?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @IsPositive()
  durationInMinutes?: number;

  @IsBoolean()
  @IsOptional()
  certificateEnabled?: boolean;
}
