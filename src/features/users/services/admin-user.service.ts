//src\features\users\services\admin-user.service.ts
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

import { UsersRepository } from '../repositories/users.repository';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { FindAllUsersQuery } from '../dto/find-all-users-query.dto';
import { UserResponseDto } from '../dto/user-response.dto';

@Injectable()
export class AdminUserService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async createUser(dto: CreateUserDto): Promise<UserResponseDto> {
    const user = await this.usersRepository.createUser(dto);
    return plainToInstance(UserResponseDto, user);
  }

  async findAll(query: FindAllUsersQuery): Promise<{
    data: UserResponseDto[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const result = await this.usersRepository.findAll(query);

    return {
      data: plainToInstance(UserResponseDto, result.users),
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit),
      },
    };
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.usersRepository.findById(id);
    return plainToInstance(UserResponseDto, user);
  }

  async updateUser(
    id: string,
    dto: UpdateUserDto,
    currentAdminId: string,
  ): Promise<UserResponseDto> {
    if (id === currentAdminId) {
      // Prevent changing critical fields on self
      if (dto.role || dto.isActive !== undefined) {
        throw new ForbiddenException(
          'You cannot change your own role or active status',
        );
      }
    }
    const user = await this.usersRepository.updateUser(id, dto);
    return plainToInstance(UserResponseDto, user);
  }

  async deactivateUser(id: string, currentAdminId: string): Promise<void> {
    if (id === currentAdminId) {
      throw new ForbiddenException('You cannot deactivate your own account');
    }

    const user = await this.usersRepository.deactivateUser(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }
  }
}
