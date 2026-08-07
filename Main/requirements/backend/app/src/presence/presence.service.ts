import { Injectable } from '@nestjs/common';
import { FriendshipStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PresenceService {
  constructor(private readonly prisma: PrismaService) {}

  async setAllUsersOffline() {
    return this.prisma.user.updateMany({
      where: {
        isOnline: true,
      },
      data: {
        isOnline: false,
        lastSeenAt: new Date(),
      },
    });
  }

  async setUserOnline(userId: number) {
    return this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        isOnline: true,
        lastSeenAt: null,
      },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        isOnline: true,
        lastSeenAt: true,
      },
    });
  }

  async setUserOffline(userId: number, lastSeenAt: Date) {
    return this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        isOnline: false,
        lastSeenAt,
      },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        isOnline: true,
        lastSeenAt: true,
      },
    });
  }

  async getAcceptedFriendIds(userId: number): Promise<number[]> {
    const friendships = await this.prisma.friendship.findMany({
      where: {
        status: FriendshipStatus.ACCEPTED,
        OR: [
          {
            requesterId: userId,
          },
          {
            receiverId: userId,
          },
        ],
      },
      select: {
        requesterId: true,
        receiverId: true,
      },
    });

    return friendships.map((friendship) =>
      friendship.requesterId === userId
        ? friendship.receiverId
        : friendship.requesterId,
    );
  }
}
