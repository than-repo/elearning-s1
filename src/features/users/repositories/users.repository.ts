//src\features\users\repositories\users.repository.ts
import { ConfigService } from '@nestjs/config';
import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../../core/database/prisma.service';

import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { FindAllUsersQuery } from '../dto/find-all-users-query.dto';

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

  async createUser(dto: CreateUserDto) {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.saltRounds);

    return this.prisma.user.create({
      data: {
        fullName: dto.fullName.trim(),
        email,
        passwordHash,
        phoneNumber: dto.phoneNumber?.trim() || null,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        gender: dto.gender || null,
        avatarUrl: dto.avatarUrl?.trim() || null,
        role: dto.role,
        isActive: true,
        emailVerified: false,
      },

      select: this.userSelect,
    });
  }

  async findAll(query: FindAllUsersQuery) {
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

    const skip = (page - 1) * limit;
    const take = limit;
    const where: any = {};
    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { email: { contains: search } },
        { phoneNumber: { contains: search } },
        //mode:"insentitive"
      ];
    }
    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive;
    if (emailVerified !== undefined) where.emailVerified = emailVerified;
    if (createdAfter || createdBefore) {
      where.createdAt = {};
      if (createdAfter) where.createdAt.gte = new Date(createdAfter);
      if (createdBefore) where.createdAt.lte = new Date(createdBefore);
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take,
        where,
        orderBy: { [sortBy]: sortOrder },
        select: this.userSelect,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { users, total, page, limit };
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    const userExists = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true },
    });

    if (!userExists) {
      throw new NotFoundException('User not found');
    }

    if (dto.email) {
      const newEmail = dto.email.toLowerCase().trim();
      if (newEmail !== userExists.email) // Needs to update email
      {
        const emailTaken = await this.prisma.user.findUnique({
          where: { email: newEmail },
        });
        if (emailTaken) {
          throw new ConflictException('Email already taken by another user');
        }
      }
    }
    let passwordHash: string | undefined;
    if (dto.password) {
      passwordHash = await bcrypt.hash(dto.password, this.saltRounds);
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        fullName: dto.fullName?.trim(),
        email: dto.email?.toLowerCase().trim(),
        passwordHash,
        phoneNumber: dto.phoneNumber?.trim() || null,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        gender: dto.gender,
        avatarUrl: dto.avatarUrl?.trim() || null,
        role: dto.role,
        isActive: dto.isActive,
        emailVerified: dto.emailVerified,
      },
      select: this.userSelect,
    });
  }

  async deactivateUser(id: string) {
    const existing = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true }, // only need to check existence
    });

    if (!existing) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: this.userSelect,
    });
  }
  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: this.userSelect,
    });

    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    return user;
  }

  // ==================== PUBLIC OPERATIONS ====================

  async findCurrentUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id, isActive: true },
      select: this.userSelect,
    });

    if (!user) {
      throw new NotFoundException(`User not found or inactive`);
    }

    return user;
  }

  async updateCurrentUser(id: string, dto: UpdateUserDto) {
    // Public users are not allowed to change role, isActive, or emailVerified
    const { role, isActive, emailVerified, password, ...safeData } = dto;

    let passwordHash: string | undefined;
    if (password) {
      passwordHash = await bcrypt.hash(password, this.saltRounds);
    }
    const userExists = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!userExists) {
      throw new NotFoundException('User not found');
    }
    return this.prisma.user.update({
      where: { id },
      data: {
        ...safeData,
        fullName: safeData.fullName?.trim(),
        email: safeData.email?.toLowerCase().trim(),
        phoneNumber: safeData.phoneNumber?.trim() || null,
        dateOfBirth: safeData.dateOfBirth
          ? new Date(safeData.dateOfBirth)
          : undefined,
        avatarUrl: safeData.avatarUrl?.trim() || null,
        passwordHash,
      },
      select: this.userSelect,
    });
  }
}
