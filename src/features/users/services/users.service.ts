// src/features/users/services/users.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { UsersRepository } from '../repositories/users.repository';
import { UserResponseDto } from '../dtos/user-response.dto';
import { PublicUserResponseDto } from '../dtos/public-user-response.dto';
import { UpdateUserDto } from '../dtos/update-user.dto';

import bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { UserCreateInput, UserUpdateInput } from 'generated/prisma/models';
import { cleanData } from 'src/common/utils/clean-data-util';
import { PrismaErrorHandler } from 'src/common/utils/prisma-error.util';

@Injectable()
export class UsersService {
  private readonly saltRounds: number;
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly configService: ConfigService,
  ) {
    const rounds = parseInt(
      this.configService.getOrThrow('PASSWORD_SALT_ROUNDS'),
      10,
    );

    if (isNaN(rounds) || rounds < 10) {
      throw new Error('PASSWORD_SALT_ROUNDS must be a number >= 10');
    }
    this.saltRounds = rounds;
  }

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
    // Public users are not allowed to change role, isActive, or emailVerified
    const { role, isActive, emailVerified, password, ...safeData } = dto;

    let passwordHash: string | undefined;
    if (password) {
      passwordHash = await bcrypt.hash(password, this.saltRounds);
    }
    const rawData: UserUpdateInput = {
      ...safeData,
      passwordHash,
    };
    const cleanedData = cleanData(rawData);
    try {
      const updatedUser = await this.usersRepository.updateProfile(
        id,
        cleanedData,
      );

      return plainToInstance(UserResponseDto, updatedUser, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      PrismaErrorHandler.handle(error, { entity: 'User' });
    }
  }
}
