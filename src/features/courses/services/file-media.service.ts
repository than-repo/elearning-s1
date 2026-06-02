//src\features\courses\services\course-sections.service.ts
import { Inject, Injectable } from '@nestjs/common';
import type { IFileMediaRepository } from '../interfaces/file-media.repository.interface';
import { FILE_MEDIA_REPOSITORY } from '../repositories/file-media.repository.token';

@Injectable()
export class FileMediaService {
  constructor(
    @Inject(FILE_MEDIA_REPOSITORY)
    private readonly iFileMediaRepository: IFileMediaRepository,
  ) {}
}
