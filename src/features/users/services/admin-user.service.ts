//src\features\users\services\admin-user.service.ts

import { ConfigService } from '@nestjs/config';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from '../repositories/users.repository';
import { CreateUserDto } from '../dtos/create-user.dto';
import { UpdateUserDto } from '../dtos/update-user.dto';
import { FindAllUsersQuery } from '../dtos/find-all-users-query.dto';
import { UserResponseDto } from '../dtos/user-response.dto';
import { UpdateUserPayload } from '../interfaces/update-user-payload.interface';
import { cleanData } from 'src/common/utils/clean-data-util';
import { UserRole } from 'generated/prisma/enums';

import { PrismaErrorHandler } from 'src/common/utils/prisma-error.util';
import { CreateUserPayload } from '../interfaces/create-user-payload.interface';

import { GetUsersPayload } from '../interfaces/get-users-payload.interface';
import { Prisma } from 'generated/prisma/client';

@Injectable()
export class AdminUsersService {
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

  async createUser(dto: CreateUserDto): Promise<UserResponseDto> {
    const passwordHash: string = await bcrypt.hash(
      dto.password,
      this.saltRounds,
    );
    const rawDate: CreateUserPayload = {
      fullName: dto.fullName,
      email: dto.email,
      passwordHash,
      phoneNumber: dto.phoneNumber || null,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      gender: dto.gender || null,
      avatarUrl: dto.avatarUrl,
      role: dto.role,
      isActive: true,
      emailVerified: false,
    };
    const createData = cleanData(rawDate) as CreateUserPayload;
    try {
      const newUser = await this.usersRepository.createUser(createData);
      return plainToInstance(UserResponseDto, newUser, {});
    } catch (error) {
      PrismaErrorHandler.handle(error, {
        entity: 'User',
      });
    }
  }

  async findAll(query: FindAllUsersQuery): Promise<{
    data: UserResponseDto[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const {
      page = 1,
      limit = 20,
      search,
      role,
      isActive,
      emailVerified,
      createdAfter,
      createdBefore,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip: number = (page - 1) * limit;
    const take: number = limit;
    //condition
    const where: Prisma.UserWhereInput = {};
    if (search?.trim()) {
      const term = search.trim();
      where.OR = [
        { fullName: { contains: term } },
        { email: { contains: term } },
        { phoneNumber: { contains: term } },
      ];
    }
    if (role) {
      where.role = role;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (emailVerified !== undefined) {
      where.emailVerified = emailVerified;
    }

    // Safe date handling
    if (createdAfter) {
      where.createdAt = where.createdAt || {};
      (where.createdAt as any).gte = new Date(createdAfter);
    }
    if (createdBefore) {
      where.createdAt = where.createdAt || {};
      (where.createdAt as any).lte = new Date(createdBefore);
    }
    const orderBy: Prisma.UserOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };
    try {
      const getUserPayload: GetUsersPayload = { skip, take, where, orderBy };
      const result = await this.usersRepository.findAll(getUserPayload);
      const { users, total } = result;
      const totalPages: number = Math.ceil(total / limit);
      return {
        data: plainToInstance(UserResponseDto, users),
        meta: { page, limit, total, totalPages },
      };
    } catch (error) {
      PrismaErrorHandler.handle(error, {
        entity: 'User',
      });
    }
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  async updateUser(
    id: string,
    dto: UpdateUserDto,
    currentAdminId: string,
  ): Promise<UserResponseDto> {
    if (id === currentAdminId) {
      // Prevent changing critical fields on self
      if (dto.role !== undefined || dto.isActive !== undefined) {
        throw new ForbiddenException(
          'You cannot change your own role or active status',
        );
      }
    }

    //Check if user exists
    const userExists = await this.usersRepository.findById(id);
    if (!userExists) {
      throw new NotFoundException('User not found');
    }
    //Prevent deactivating last Admin Account
    //If someone removes or bypasses the self-protection in the future,
    //this check still protects the system
    if (dto.isActive === false && userExists.role === UserRole.ADMIN) {
      const activeAdminCount = await this.usersRepository.countActiveAdmins();
      if (activeAdminCount <= 1) {
        throw new ForbiddenException(
          'Cannot deactivate the last remaining admin account',
        );
      }
    }
    // Check email Exist
    // It can have race condition
    if (dto.email) {
      const newEmail = dto.email?.toLowerCase().trim();
      if (newEmail !== userExists.email) {
        const emailTaken = await this.usersRepository.findByEmail(newEmail);
        if (emailTaken) {
          throw new ConflictException('Email already taken');
        }
      }
    }

    const rawData: UpdateUserPayload = {
      fullName: dto.fullName,
      email: dto.email?.toLowerCase(),
      phoneNumber: dto.phoneNumber,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      gender: dto.gender,
      avatarUrl: dto.avatarUrl,
      role: dto.role,
      isActive: dto.isActive,
      emailVerified: dto.emailVerified,
    };

    if (dto.password) {
      rawData.passwordHash = await bcrypt.hash(dto.password, this.saltRounds);
    }
    const updateData = cleanData(rawData);

    try {
      const updatedUser = await this.usersRepository.updateUser(id, updateData);
      return plainToInstance(UserResponseDto, updatedUser);
    } catch (error: unknown) {
      PrismaErrorHandler.handle(error, {
        entity: 'User',
        fieldMsg: {
          email: 'This email is already taken',
        },
      });
    }
  }

  async deactivateUser(id: string, currentAdminId: string): Promise<void> {
    if (id === currentAdminId) {
      throw new ForbiddenException('You cannot deactivate your own account');
    }

    try {
      await this.usersRepository.deactivateUser(id);
    } catch (error: unknown) {
      PrismaErrorHandler.handle(error, {
        entity: 'User',
      });
    }
  }
}
