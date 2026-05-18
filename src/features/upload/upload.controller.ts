//src\features\upload\upload.controller.ts
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../features/auth/guards/jwt-auth.guard';
import { UploadService } from './upload.service';
import {
  GetUploadSignatureDto,
  SignatureResponseDto,
} from './dtos/get-upload-signature.dto';
import {
  ApiAcceptedResponse,
  ApiBadRequestResponse,
  ApiBody,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Upload')
@Controller('upload')
@UseGuards(JwtAuthGuard)
@Throttle({ default: { ttl: 60, limit: 20 } })
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @ApiOperation({ summary: 'Get signature for cloud' })
  @ApiAcceptedResponse({ type: SignatureResponseDto })
  @ApiBadRequestResponse()
  @ApiBody({ type: GetUploadSignatureDto })
  @Post('signature')
  async getUploadSignature(
    @Body() dto: GetUploadSignatureDto,
  ): Promise<SignatureResponseDto> {
    return this.uploadService.getUploadSignature(dto);
  }
}
