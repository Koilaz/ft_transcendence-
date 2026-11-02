import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { FriendsModule } from './friends/friends.module';
import { PresenceModule } from './presence/presence.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { MetricsController } from './metrics/metrics.controller';
import { MetricsInterceptor } from './metrics/metrics.interceptor';

@Module({
imports: [
    PrismaModule,
    UsersModule,
    AuthModule,
    FriendsModule,
    PresenceModule,
  ],
  controllers: [AppController, MetricsController],
	providers: [
  		{
    		provide: APP_INTERCEPTOR,
    		useClass: MetricsInterceptor,
  		},
	],
})
export class AppModule {}
