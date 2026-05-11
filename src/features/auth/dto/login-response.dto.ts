// src/features/auth/dto/auth-response.dto.ts
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty({ description: 'Basic user information' })
  user!: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };

  @ApiProperty({ description: 'JWT access token' })
  accessToken!: string;

  @ApiHideProperty()
  refreshToken!: string;

  @ApiProperty({
    description: 'Optional success message',
    required: false,
  })
  message?: string;
}
