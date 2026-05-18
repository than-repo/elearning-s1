//src\features\users\controllers\users.controller.ts
import { UpdateUserDto } from './../dtos/update-user.dto';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UserResponseDto } from '../dtos/user-response.dto';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from '../services/users.service';
import { JwtAuthGuard } from 'src/features/auth/guards/jwt-auth.guard';
import type { RequestWithUser } from 'src/common/interfaces/request-with-user';
import { PublicUserResponseDto } from '../dtos/public-user-response.dto';
import { Public } from 'src/features/auth/decorators/public.decorator';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Users')
@Controller('/users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @Throttle({ default: { limit: 30, ttl: 60 } })
  @ApiOperation({ summary: 'Get current logged-in user profile' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing access token' })
  async getMyProfile(@Req() req: RequestWithUser): Promise<UserResponseDto> {
    return this.usersService.findOne(req.user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get public user profile by ID' })
  @ApiOkResponse({
    type: PublicUserResponseDto,
  })
  @ApiNotFoundResponse()
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @Public()
  @Throttle({ default: { limit: 200, ttl: 60 } })
  async getUserProfile(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PublicUserResponseDto> {
    return this.usersService.findOnePublic(id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiOkResponse({
    type: UserResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing access token' })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @Throttle({ default: { limit: 10, ttl: 60 } })
  async updateMyProfile(
    @Req() req: RequestWithUser,
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.update(req.user.sub, dto);
  }
}
