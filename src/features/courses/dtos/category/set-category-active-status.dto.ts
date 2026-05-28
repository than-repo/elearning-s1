import { IsBoolean, IsNotEmpty } from 'class-validator';

export class SetCategoryActiveStatusDto {
  @IsNotEmpty()
  @IsBoolean()
  isActive!: boolean;
}
