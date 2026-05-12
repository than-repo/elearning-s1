//src\features\users\services\admin-user.service.ts
import { Injectable } from '@nestjs/common';
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

  async updateUser(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.usersRepository.updateUser(id, dto);
    return plainToInstance(UserResponseDto, user);
  }

  async deactivateUser(id: string): Promise<UserResponseDto> {
    const user = await this.usersRepository.deactivateUser(id);
    return plainToInstance(UserResponseDto, user);
  }
}
