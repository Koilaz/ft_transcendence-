import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';

import { FriendsModule } from './friends/friends.module';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AuthModule,
    FriendsModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}