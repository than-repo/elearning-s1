import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { CloudinaryModule } from 'src/core/storage/cloudinary/cloudinary.module';
import { CloudinaryService } from 'src/core/storage/cloudinary/cloudinary.service';

@Module({
  controllers: [UploadController],
  providers: [UploadService, CloudinaryService],
  imports: [CloudinaryModule],
  exports: [UploadService],
})
export class UploadModule {}
