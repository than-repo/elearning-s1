import { PartialType } from '@nestjs/swagger';
import { CreateFileMediaDto } from './create-file-media.dto';

export class UpdateFileMediaDto extends PartialType(CreateFileMediaDto) {}
