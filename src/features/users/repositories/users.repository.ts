//src\features\users\repositories\users.repository.ts
import { ConfigService } from '@nestjs/config';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';

import { UserSelectResult } from '../interfaces/user-select-result.interface';
import { UpdateUserPayload } from '../interfaces/update-user-payload.interface';
import { UserRole } from 'generated/prisma/enums';
import { CreateUserPayload } from '../interfaces/create-user-payload.interface';
import { GetUsersPayload } from '../interfaces/get-users-payload.interface';
import { UserUpdateInput } from 'generated/prisma/models';

@Injectable()
export class UsersRepository {
  private readonly saltRounds: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.saltRounds = parseInt(
      this.configService.getOrThrow('PASSWORD_SALT_ROUNDS'),
      10,
    );
  }

  private readonly userSelect = {
    id: true,
    fullName: true,
    email: true,
    phoneNumber: true,
    dateOfBirth: true,
    gender: true,
    avatarUrl: true,
    role: true,
    isActive: true,
    emailVerified: true,
    createdAt: true,
    updatedAt: true,
    lastLoginAt: true,
  } as const;

  // ==================== ADMIN OPERATIONS ====================

  async createUser(data: CreateUserPayload) {
    return this.prisma.user.create({
      data,
      select: this.userSelect,
    });
  }

  async findAll(getUserPayload: GetUsersPayload) {
    const { skip, take, where, orderBy } = getUserPayload;
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take,
        where,
        orderBy,
        select: this.userSelect,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { users, total };
  }

  async updateUser(id: string, data: UpdateUserPayload) {
    return this.prisma.user.update({
      where: { id },
      data,
      select: this.userSelect,
    });
  }

  async countActiveAdmins(): Promise<number> {
    return this.prisma.user.count({
      where: { role: UserRole.ADMIN, isActive: true },
    });
  }

  async deactivateUser(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: this.userSelect,
    });
  }
  async findById(id: string): Promise<UserSelectResult | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: this.userSelect,
    });
  }

  async findByEmail(email: string): Promise<UserSelectResult | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: this.userSelect,
    });
  }

  // ==================== PUBLIC OPERATIONS ====================

  async findActiveById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id, isActive: true },
      select: this.userSelect,
    });

    if (!user) {
      throw new NotFoundException(`User not found or inactive`);
    }

    return user;
  }

  async updateProfile(id: string, data: UserUpdateInput) {
    return this.prisma.user.update({
      where: { id },
      data: {
        ...data,
      },
      select: this.userSelect,
    });
  }

  async findPublicById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id, isActive: true },
      select: {
        id: true,
        fullName: true,
        avatarUrl: true,
        gender: true,
        role: true,
        createdAt: true,
        // Only expose safe public fields
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}
