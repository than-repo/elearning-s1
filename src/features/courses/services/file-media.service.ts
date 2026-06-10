import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { PaginatedResponse } from '../dtos/paginated-response.dto';
import { CreateFileMediaDto } from '../dtos/file-media/create-file-media.dto';
import {
  FILE_MEDIA_VIEW_GROUPS,
  FileMediaResponseDto,
} from '../dtos/file-media/file-media-response.dto';
import {
  FileMediaSortFieldDto,
  QueryFileMediaDto,
} from '../dtos/file-media/query-file-media.dto';
import { UpdateFileMediaDto } from '../dtos/file-media/update-file-media.dto';
import type {
  CreateFileMediaInput,
  FileMedia,
  FileMediaOrderByInput,
  FileMediaWhereInput,
  IFileMediaRepository,
  UpdateFileMediaInput,
} from '../interfaces/file-media.repository.interface';
import { FILE_MEDIA_REPOSITORY } from '../repositories/file-media.repository.token';
import { CourseAccessService } from './course-access.service';

@Injectable()
export class FileMediaService {
  constructor(
    @Inject(FILE_MEDIA_REPOSITORY)
    private readonly fileMediaRepository: IFileMediaRepository,

    private readonly courseAccessService: CourseAccessService,
  ) {}

  private toOwnerFileMediaResponse(fileMedia: FileMedia): FileMediaResponseDto {
    return plainToInstance(FileMediaResponseDto, fileMedia, {
      excludeExtraneousValues: true,
      groups: [FILE_MEDIA_VIEW_GROUPS.OWNER],
    });
  }

  async createFileMedia(
    courseId: string,
    sectionId: string,
    lessonId: string,
    instructorId: string,
    dto: CreateFileMediaDto,
  ): Promise<FileMediaResponseDto> {
    await this.courseAccessService.ensureInstructorCanManageLesson(
      courseId,
      instructorId,
      sectionId,
      lessonId,
    );

    const fileMedia = await this.fileMediaRepository.create({
      lessonId,
      cloudinaryPublicId: dto.cloudinaryPublicId ?? null,
      url: dto.url,
      type: dto.type,
      filename: dto.filename ?? null,
      mimeType: dto.mimeType ?? null,
      sizeInBytes: dto.sizeInBytes ?? null,
    } satisfies CreateFileMediaInput);

    return this.toOwnerFileMediaResponse(fileMedia);
  }

  async getFileMediaList(
    courseId: string,
    sectionId: string,
    lessonId: string,
    instructorId: string,
    query: QueryFileMediaDto,
  ): Promise<PaginatedResponse<FileMediaResponseDto>> {
    await this.courseAccessService.ensureInstructorCanManageLesson(
      courseId,
      instructorId,
      sectionId,
      lessonId,
    );

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const offset = (page - 1) * limit;

    const where: FileMediaWhereInput = {
      lessonId,
      filenameContains: query.search,
      type: query.type,
      mimeType: query.mimeType,
    };

    const orderBy: FileMediaOrderByInput = {
      field: query.sortField ?? FileMediaSortFieldDto.CREATED_AT,
      direction: query.sortDirection ?? 'desc',
    };

    const [fileMediaList, total] = await Promise.all([
      this.fileMediaRepository.findMany({
        where,
        orderBy,
        limit,
        offset,
      }),
      this.fileMediaRepository.count({
        where,
      }),
    ]);

    const data = fileMediaList.map((fileMedia) =>
      this.toOwnerFileMediaResponse(fileMedia),
    );
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async getFileMedia(
    courseId: string,
    sectionId: string,
    lessonId: string,
    fileMediaId: string,
    instructorId: string,
  ): Promise<FileMediaResponseDto> {
    await this.courseAccessService.ensureInstructorCanManageLesson(
      courseId,
      instructorId,
      sectionId,
      lessonId,
    );

    const fileMedia = await this.fileMediaRepository.findByIdInLesson(
      fileMediaId,
      lessonId,
    );

    if (!fileMedia) {
      throw new NotFoundException('FILE_MEDIA_NOT_FOUND');
    }

    return this.toOwnerFileMediaResponse(fileMedia);
  }

  async updateFileMedia(
    courseId: string,
    sectionId: string,
    lessonId: string,
    fileMediaId: string,
    instructorId: string,
    dto: UpdateFileMediaDto,
  ): Promise<FileMediaResponseDto> {
    await this.courseAccessService.ensureInstructorCanManageLesson(
      courseId,
      instructorId,
      sectionId,
      lessonId,
    );

    const updateData = this.buildUpdateFileMediaInput(dto);

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('NO_VALID_FILE_MEDIA_FIELDS_PROVIDED');
    }

    const fileMedia = await this.fileMediaRepository.updateInLesson(
      fileMediaId,
      lessonId,
      updateData,
    );

    if (!fileMedia) {
      throw new NotFoundException('FILE_MEDIA_NOT_FOUND');
    }

    return this.toOwnerFileMediaResponse(fileMedia);
  }

  async deleteFileMedia(
    courseId: string,
    sectionId: string,
    lessonId: string,
    fileMediaId: string,
    instructorId: string,
  ): Promise<void> {
    await this.courseAccessService.ensureInstructorCanManageLesson(
      courseId,
      instructorId,
      sectionId,
      lessonId,
    );

    const deleted = await this.fileMediaRepository.softDeleteInLesson(
      fileMediaId,
      lessonId,
    );

    if (!deleted) {
      throw new NotFoundException('FILE_MEDIA_NOT_FOUND');
    }
  }

  private buildUpdateFileMediaInput(
    dto: UpdateFileMediaDto,
  ): UpdateFileMediaInput {
    const updateData: UpdateFileMediaInput = {};

    if (dto.cloudinaryPublicId !== undefined) {
      updateData.cloudinaryPublicId = dto.cloudinaryPublicId;
    }

    if (dto.url !== undefined) {
      updateData.url = dto.url;
    }

    if (dto.type !== undefined) {
      updateData.type = dto.type;
    }

    if (dto.filename !== undefined) {
      updateData.filename = dto.filename;
    }

    if (dto.mimeType !== undefined) {
      updateData.mimeType = dto.mimeType;
    }

    if (dto.sizeInBytes !== undefined) {
      updateData.sizeInBytes = dto.sizeInBytes;
    }

    return updateData;
  }
}
