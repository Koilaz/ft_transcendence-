import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { PrismaModule } from '../prisma/prisma.module';
import { PresenceGateway } from './presence.gateway';
import { PresenceService } from './presence.service';

@Module({
  imports: [
    PrismaModule,

    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET;

        if (!secret) {
          throw new Error('JWT_SECRET is missing');
        }

        return {
          secret,
        };
      },
    }),
  ],
  providers: [
    PresenceGateway,
    PresenceService,
  ],
  exports: [
    PresenceGateway,
    PresenceService,
  ],
})
export class PresenceModule {}
