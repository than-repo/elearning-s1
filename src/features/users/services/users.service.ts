// src/features/users/services/users.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { UsersRepository } from '../repositories/users.repository';
import { UserResponseDto } from '../dto/user-response.dto';
import { PublicUserResponseDto } from '../dto/public-user-response.dto';
import { UpdateUserDto } from '../dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  /**
   * Get full private profile (used by /me)
   */
  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get limited public profile (used by /:id)
   */
  async findOnePublic(id: string): Promise<PublicUserResponseDto> {
    const user = await this.usersRepository.findPublicById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return plainToInstance(PublicUserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Update current user profile
   */
  async update(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    const updatedUser = await this.usersRepository.updateProfile(id, dto);

    return plainToInstance(UserResponseDto, updatedUser, {
      excludeExtraneousValues: true,
    });
  }
}
