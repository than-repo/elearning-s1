// src/payments/payments.controller.ts

import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentsService } from './services/payments.service';
import { CreateVnpayPaymentDto } from './dtos/create-vnpay-payment.dto';
import { CreateSimulationPaymentDto } from './dtos/create-simulation-payment.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import { VnpayReturnResponseDto } from './dtos/vnpay-return-response.dto';
import { VnpayIpnResponseDto } from './dtos/vnpay-inp-response.dto';
import { SimulationPaymentResponseDto } from './dtos/simulation-payment-response.dto';

import type { Request, Response } from 'express';
import { SkipResponseFormatting } from 'src/common/decorators/skip-response-formatting.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from 'generated/prisma/enums';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  GetPaymentsQueryDto,
  GetPaymentsResponseDto,
} from './dtos/get-payments-response.dto';

@Throttle({ default: { ttl: 60, limit: 5 } })
@ApiTags('Payments')
@Controller({ path: 'payments', version: '1' })
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly configService: ConfigService,
  ) {}

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
  @Post('simulation/create-payment')
  async createSimulationPayment(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateSimulationPaymentDto,
  ): Promise<SimulationPaymentResponseDto> {
    return this.paymentsService.createSimulationPayment(userId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.LEARNER)
  @Post('simulation/:paymentId/confirm')
  async confirmSimulationPayment(
    @CurrentUser('sub') userId: string,
    @Param('paymentId', new ParseUUIDPipe({ version: '4' })) paymentId: string,
  ): Promise<SimulationPaymentResponseDto> {
    return this.paymentsService.confirmSimulationPayment(userId, paymentId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.LEARNER)
  @Post('simulation/:paymentId/fail')
  async failSimulationPayment(
    @CurrentUser('sub') userId: string,
    @Param('paymentId', new ParseUUIDPipe({ version: '4' })) paymentId: string,
  ): Promise<SimulationPaymentResponseDto> {
    return this.paymentsService.failSimulationPayment(userId, paymentId);
  }

  //VNpay

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
    @Res() res: Response,
  ): Promise<void> {
    const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');
    const redirectUrl = new URL('/payments/vnpay/return', frontendUrl);

    for (const [key, value] of Object.entries(query)) {
      if (typeof value === 'string') {
        redirectUrl.searchParams.append(key, value);
        continue;
      }

      if (Array.isArray(value)) {
        for (const item of value) {
          redirectUrl.searchParams.append(key, item);
        }
      }
    }

    res.redirect(302, redirectUrl.toString());
  }

  @Get('vnpay/verify-return')
  async verifyVnpayReturn(
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

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.LEARNER)
  async getMyPayments(
    @CurrentUser('sub') learner: string,
    @Query() query: GetPaymentsQueryDto,
  ): Promise<GetPaymentsResponseDto> {
    return this.paymentsService.getLearnerPayments(learner, query);
  }
}
