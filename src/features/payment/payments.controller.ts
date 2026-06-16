// src/payments/payments.controller.ts

import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PaymentsService } from './services/payments.service';
import { CreateVnpayPaymentDto } from './dtos/create-vnpay-payment.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import { VnpayReturnResponseDto } from './dtos/vnpay-return-response.dto';
import { VnpayIpnResponseDto } from './dtos/vnpay-inp-response.dto';

import type { Request } from 'express';
import { SkipResponseFormatting } from 'src/common/decorators/skip-response-formatting.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from 'generated/prisma/enums';
import { RolesGuard } from '../auth/guards/roles.guard';

@Throttle({ default: { ttl: 60, limit: 5 } })
@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}
  private getClientIp(req: Request): string {
    const forwardedFor = req.headers['x-forwarded-for'];

    if (typeof forwardedFor === 'string') {
      return forwardedFor.split(',')[0].trim();
    }

    if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
      return forwardedFor[0];
    }

    return req.ip || req.socket.remoteAddress || '127.0.0.1';
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.LEARNER)
  @Post('vnpay/create-payment-url')
  async createVnpayPaymentUrl(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateVnpayPaymentDto,
    @Req() req: Request,
  ) {
    const ipAddr = this.getClientIp(req);

    return this.paymentsService.createVnpayPaymentUrl(userId, dto, ipAddr);
  }

  @Get('vnpay/return')
  async handleVnpayReturn(
    @Query() query: Record<string, string | string[] | undefined>,
  ): Promise<VnpayReturnResponseDto> {
    return this.paymentsService.handleVnpayReturn(query);
  }

  @Get('vnpay/ipn')
  @HttpCode(200)
  @SkipResponseFormatting()
  async handleVnpayIpn(
    @Query() query: Record<string, string | string[] | undefined>,
  ): Promise<VnpayIpnResponseDto> {
    return this.paymentsService.handleVnpayIpn(query);
  }
}
