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
exports.PresenceService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
let PresenceService = class PresenceService {
    constructor(prisma) {
        this.prisma = prisma;
    }
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
    async setUserOnline(userId) {
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
    async setUserOffline(userId, lastSeenAt) {
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
    async getAcceptedFriendIds(userId) {
        const friendships = await this.prisma.friendship.findMany({
            where: {
                status: client_1.FriendshipStatus.ACCEPTED,
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
        return friendships.map((friendship) => friendship.requesterId === userId
            ? friendship.receiverId
            : friendship.requesterId);
    }
};
exports.PresenceService = PresenceService;
exports.PresenceService = PresenceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PresenceService);
