import { IsUUID } from 'class-validator';

export class CreateSimulationPaymentDto {
  @IsUUID()
  courseId!: string;
}
