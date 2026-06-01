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
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from 'generated/prisma/enums';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('Upload')
@Controller({ path: 'upload', version: '1' })
@UseGuards(JwtAuthGuard)
@Throttle({ default: { ttl: 60, limit: 20 } })
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @ApiOperation({ summary: 'Get signature for cloud' })
  @ApiAcceptedResponse({ type: SignatureResponseDto })
  @ApiBadRequestResponse()
  @ApiBody({ type: GetUploadSignatureDto })
  @Roles(UserRole.INSTRUCTOR, UserRole.LEARNER, UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Post('signature')
  async getUploadSignature(
    @Body() dto: GetUploadSignatureDto,
  ): Promise<SignatureResponseDto> {
    return this.uploadService.getUploadSignature(dto);
  }
}
