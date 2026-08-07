"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FriendsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
let FriendsService = class FriendsService {
    constructor(prisma) {
        this.prisma = prisma;
        this.publicUserSelect = {
            id: true,
            username: true,
            avatarUrl: true,
            isOnline: true,
            lastSeenAt: true,
            createdAt: true,
        };
    }
    async sendFriendRequest(currentUserId, targetUserId) {
        if (currentUserId === targetUserId) {
            throw new common_1.BadRequestException('You cannot add yourself as a friend');
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
            throw new common_1.NotFoundException('User not found');
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
        if (existingFriendship?.status === client_1.FriendshipStatus.ACCEPTED) {
            throw new common_1.ConflictException('You are already friends with this user');
        }
        if (existingFriendship?.status === client_1.FriendshipStatus.PENDING &&
            existingFriendship.requesterId === currentUserId) {
            throw new common_1.ConflictException('Friend request already sent');
        }
        if (existingFriendship?.status === client_1.FriendshipStatus.PENDING &&
            existingFriendship.requesterId === targetUserId) {
            throw new common_1.ConflictException('This user already sent you a friend request');
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
    async acceptFriendRequest(currentUserId, requesterUserId) {
        if (currentUserId === requesterUserId) {
            throw new common_1.BadRequestException('Invalid friend request');
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
            throw new common_1.NotFoundException('Friend request not found');
        }
        if (friendship.status === client_1.FriendshipStatus.ACCEPTED) {
            throw new common_1.ConflictException('Friend request already accepted');
        }
        return this.prisma.friendship.update({
            where: {
                id: friendship.id,
            },
            data: {
                status: client_1.FriendshipStatus.ACCEPTED,
            },
            include: {
                requester: {
                    select: this.publicUserSelect,
                },
            },
        });
    }
    async removeFriendship(currentUserId, otherUserId) {
        if (currentUserId === otherUserId) {
            throw new common_1.BadRequestException('Invalid user');
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
            throw new common_1.NotFoundException('Friendship not found');
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
    async getFriends(currentUserId) {
        const friendships = await this.prisma.friendship.findMany({
            where: {
                status: client_1.FriendshipStatus.ACCEPTED,
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
            const friend = friendship.requesterId === currentUserId
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
    async getReceivedFriendRequests(currentUserId) {
        const requests = await this.prisma.friendship.findMany({
            where: {
                receiverId: currentUserId,
                status: client_1.FriendshipStatus.PENDING,
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
    async getSentFriendRequests(currentUserId) {
        const requests = await this.prisma.friendship.findMany({
            where: {
                requesterId: currentUserId,
                status: client_1.FriendshipStatus.PENDING,
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
};
exports.FriendsService = FriendsService;
exports.FriendsService = FriendsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], FriendsService);
