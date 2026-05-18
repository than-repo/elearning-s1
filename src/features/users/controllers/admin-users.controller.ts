//src\features\users\controllers\admin-users.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { Roles } from 'src/features/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/features/auth/guards/jwt-auth.guard';
import { AdminUsersService } from '../services/admin-user.service';
import { CreateUserDto } from '../dtos/create-user.dto';
import { UserResponseDto } from '../dtos/user-response.dto';
import { FindAllUsersQuery } from '../dtos/find-all-users-query.dto';
import { UpdateUserDto } from '../dtos/update-user.dto';
import { RolesGuard } from 'src/features/auth/guards/roles.guard';
import { UserRole } from 'generated/prisma/enums';
import type { RequestWithUser } from 'src/common/interfaces/request-with-user';
import { Throttle } from '@nestjs/throttler';
import { PaginatedUsersResponseDto } from '../dtos/paginated-users-response.dto';

@ApiTags('Admin-Users')
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminUsersController {
  constructor(private readonly adminUserService: AdminUsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { ttl: 60, limit: 5 } })
  @ApiOperation({ summary: 'Create new user (Admin only - any role)' })
  @ApiBody({ type: CreateUserDto })
  @ApiCreatedResponse({
    description: 'User created successfully',
    type: UserResponseDto,
  })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse({ description: 'Only admins can create users' })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  async create(@Body() createUserDto: CreateUserDto) {
    return this.adminUserService.createUser(createUserDto);
  }

  @Get()
  @Throttle({ default: { ttl: 60, limit: 30 } })
  @ApiOperation({ summary: 'Get all users with pagination (Admin only)' })
  @ApiOkResponse({
    description: 'Paginated list of users',
    type: PaginatedUsersResponseDto,
  })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async findAll(@Query() query: FindAllUsersQuery) {
    return this.adminUserService.findAll(query);
  }

  @Get(':id')
  @Throttle({ default: { limit: 30, ttl: 60 } })
  @ApiOperation({ summary: 'Get user by ID (Admin only)' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminUserService.findOne(id);
  }

  @Patch(':id')
  @Throttle({ default: { limit: 10, ttl: 60 } })
  @ApiOperation({ summary: 'Update user (Admin only)' })
  @ApiBody({ type: UpdateUserDto })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiNotFoundResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() req: RequestWithUser,
  ) {
    return this.adminUserService.updateUser(id, updateUserDto, req.user.sub);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { ttl: 60, limit: 5 } })
  @ApiOperation({ summary: 'Deactivate user (Admin only)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiNoContentResponse({ description: 'User deactivated successfully' })
  @ApiNotFoundResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: RequestWithUser,
  ) {
    await this.adminUserService.deactivateUser(id, req.user.sub);
  }
}
