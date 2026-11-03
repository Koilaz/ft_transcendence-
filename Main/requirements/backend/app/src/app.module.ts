import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { FriendsModule } from './friends/friends.module';
import { PresenceModule } from './presence/presence.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { MetricsController } from './metrics/metrics.controller';
import { NavigationController } from './metrics/navigation.controller';
import { LogstashLogger } from './logger/logstash.logger';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AuthModule,
    FriendsModule,
    PresenceModule,
  ],
  controllers: [AppController, MetricsController, NavigationController],
  providers: [LogstashLogger],
})
export class AppModule {}
