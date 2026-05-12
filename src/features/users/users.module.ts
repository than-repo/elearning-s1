//src\features\users\users.module.ts
import { Module } from '@nestjs/common';
import { UsersService } from './services/users.service';
import { AdminUserService } from './services/admin-user.service';
import { UsersRepository } from './repositories/users.repository';
import { AdminUsersController } from './controllers/admin-users.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  exports: [UsersService],

  providers: [UsersService, AdminUserService, UsersRepository],
  controllers: [AdminUsersController],
})
export class UsersModule {}
