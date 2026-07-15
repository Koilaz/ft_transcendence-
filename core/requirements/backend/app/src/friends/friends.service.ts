import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FriendshipStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FriendsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly publicUserSelect = {
    id: true,
    username: true,
    avatarUrl: true,
    createdAt: true,
  };

  async sendFriendRequest(currentUserId: number, targetUserId: number) {
    if (currentUserId === targetUserId) {
      throw new BadRequestException('You cannot add yourself as a friend');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: {
        id: targetUserId,
      },
      select: {
        id: true,
      },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    const existingFriendship = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          {
            requesterId: currentUserId,
            receiverId: targetUserId,
          },
          {
            requesterId: targetUserId,
            receiverId: currentUserId,
          },
        ],
      },
    });

    if (existingFriendship?.status === FriendshipStatus.ACCEPTED) {
      throw new ConflictException('You are already friends with this user');
    }

    if (
      existingFriendship?.status === FriendshipStatus.PENDING &&
      existingFriendship.requesterId === currentUserId
    ) {
      throw new ConflictException('Friend request already sent');
    }

    if (
      existingFriendship?.status === FriendshipStatus.PENDING &&
      existingFriendship.requesterId === targetUserId
    ) {
      throw new ConflictException(
        'This user already sent you a friend request',
      );
    }

    return this.prisma.friendship.create({
      data: {
        requesterId: currentUserId,
        receiverId: targetUserId,
      },
      include: {
        receiver: {
          select: this.publicUserSelect,
        },
      },
    });
  }

  async acceptFriendRequest(currentUserId: number, requesterUserId: number) {
    if (currentUserId === requesterUserId) {
      throw new BadRequestException('Invalid friend request');
    }

    const friendship = await this.prisma.friendship.findUnique({
      where: {
        requesterId_receiverId: {
          requesterId: requesterUserId,
          receiverId: currentUserId,
        },
      },
    });

    if (!friendship) {
      throw new NotFoundException('Friend request not found');
    }

    if (friendship.status === FriendshipStatus.ACCEPTED) {
      throw new ConflictException('Friend request already accepted');
    }

    return this.prisma.friendship.update({
      where: {
        id: friendship.id,
      },
      data: {
        status: FriendshipStatus.ACCEPTED,
      },
      include: {
        requester: {
          select: this.publicUserSelect,
        },
      },
    });
  }

  async removeFriendship(currentUserId: number, otherUserId: number) {
    if (currentUserId === otherUserId) {
      throw new BadRequestException('Invalid user');
    }

    const friendship = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          {
            requesterId: currentUserId,
            receiverId: otherUserId,
          },
          {
            requesterId: otherUserId,
            receiverId: currentUserId,
          },
        ],
      },
    });

    if (!friendship) {
      throw new NotFoundException('Friendship not found');
    }

    await this.prisma.friendship.delete({
      where: {
        id: friendship.id,
      },
    });

    return {
      message: 'Friendship removed',
    };
  }

  async getFriends(currentUserId: number) {
    const friendships = await this.prisma.friendship.findMany({
      where: {
        status: FriendshipStatus.ACCEPTED,
        OR: [
          {
            requesterId: currentUserId,
          },
          {
            receiverId: currentUserId,
          },
        ],
      },
      include: {
        requester: {
          select: this.publicUserSelect,
        },
        receiver: {
          select: this.publicUserSelect,
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return friendships.map((friendship) => {
      const friend =
        friendship.requesterId === currentUserId
          ? friendship.receiver
          : friendship.requester;

      return {
        id: friendship.id,
        friend,
        createdAt: friendship.createdAt,
        updatedAt: friendship.updatedAt,
      };
    });
  }

  async getReceivedFriendRequests(currentUserId: number) {
    const requests = await this.prisma.friendship.findMany({
      where: {
        receiverId: currentUserId,
        status: FriendshipStatus.PENDING,
      },
      include: {
        requester: {
          select: this.publicUserSelect,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return requests.map((request) => ({
      id: request.id,
      requester: request.requester,
      createdAt: request.createdAt,
    }));
  }


  async getSentFriendRequests(currentUserId: number) {
    const requests = await this.prisma.friendship.findMany({
      where: {
        requesterId: currentUserId,
        status: FriendshipStatus.PENDING,
      },
      include: {
        receiver: {
          select: this.publicUserSelect,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return requests.map((request) => ({
      id: request.id,
      receiver: request.receiver,
      createdAt: request.createdAt,
    }));
  }


}