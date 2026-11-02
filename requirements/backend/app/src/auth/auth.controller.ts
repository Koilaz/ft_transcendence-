import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Prisma } from '@prisma/client';

import { randomUUID } from 'node:crypto';
import { diskStorage } from 'multer';

import { UpdateProfileDto } from '../users/dto/update-profile.dto';
import { UsersService } from '../users/users.service';

import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

type AuthenticatedRequest = {
  user: {
    userId: number;
    username: string;
  };
};

const avatarExtensions: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Req() request: AuthenticatedRequest) {
    const user = await this.usersService.findPublicById(
      request.user.userId,
    );

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateMe(
    @Req() request: AuthenticatedRequest,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    const username = updateProfileDto.username?.trim();

    if (!username) {
      throw new BadRequestException('Username is required');
    }

    try {
      return await this.usersService.updateUsername(
        request.user.userId,
        username,
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Username already in use');
      }

      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: '/app/uploads/avatars',

        filename: (
          _request,
          file,
          callback,
        ) => {
          const extension = avatarExtensions[file.mimetype];

          callback(
            null,
            `${randomUUID()}${extension}`,
          );
        },
      }),

      limits: {
        fileSize: 2 * 1024 * 1024,
      },

      fileFilter: (
        _request,
        file,
        callback,
      ) => {
        if (!avatarExtensions[file.mimetype]) {
          callback(
            new BadRequestException(
              'Only JPEG, PNG and WebP images are allowed',
            ),
            false,
          );

          return;
        }

        callback(null, true);
      },
    }),
  )
  async updateAvatar(
    @Req() request: AuthenticatedRequest,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Avatar file is required',
      );
    }

    const avatarUrl =
      `/uploads/avatars/${file.filename}`;

    return this.usersService.updateAvatar(
      request.user.userId,
      avatarUrl,
    );
  }
}