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
var PresenceGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PresenceGateway = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const ws_1 = require("ws");
const presence_service_1 = require("./presence.service");
let PresenceGateway = PresenceGateway_1 = class PresenceGateway {
    constructor(jwtService, presenceService) {
        this.jwtService = jwtService;
        this.presenceService = presenceService;
        this.logger = new common_1.Logger(PresenceGateway_1.name);
        this.webSocketServer = null;
        this.heartbeatInterval = null;
        this.userSockets = new Map();
    }
    async attach(server) {
        if (this.webSocketServer) {
            return;
        }
        await this.presenceService.setAllUsersOffline();
        this.webSocketServer = new ws_1.WebSocketServer({
            noServer: true,
        });
        server.on('upgrade', (request, socket, head) => {
            void this.handleUpgrade(request, socket, head);
        });
        this.webSocketServer.on('connection', (client) => {
            void this.handleConnection(client);
        });
        this.startHeartbeat();
        this.logger.log('Presence WebSocket attached on /ws/presence');
    }
    async handleUpgrade(request, socket, head) {
        try {
            const url = new URL(request.url ?? '', `https://${request.headers.host ?? 'localhost'}`);
            if (url.pathname !== '/ws/presence') {
                this.rejectUpgrade(socket, 404, 'Not Found');
                return;
            }
            const token = this.extractToken(request, url);
            if (!token) {
                this.rejectUpgrade(socket, 401, 'Unauthorized');
                return;
            }
            try {
                const payload = await this.jwtService.verifyAsync(token);
                if (!Number.isInteger(payload.sub)) {
                    this.rejectUpgrade(socket, 401, 'Unauthorized');
                    return;
                }
                this.webSocketServer?.handleUpgrade(request, socket, head, (client) => {
                    const authenticatedClient = client;
                    authenticatedClient.userId = payload.sub;
                    authenticatedClient.isAlive = true;
                    this.webSocketServer?.emit('connection', authenticatedClient, request);
                });
            }
            catch {
                this.rejectUpgrade(socket, 401, 'Unauthorized');
            }
        }
        catch (error) {
            this.logger.error('Failed to handle presence upgrade', error);
            this.rejectUpgrade(socket, 400, 'Bad Request');
        }
    }
    async handleConnection(client) {
        const userId = client.userId;
        if (!userId) {
            client.close(1008, 'Unauthorized');
            return;
        }
        let sockets = this.userSockets.get(userId);
        const wasOffline = !sockets || sockets.size === 0;
        if (!sockets) {
            sockets = new Set();
            this.userSockets.set(userId, sockets);
        }
        sockets.add(client);
        client.on('pong', () => {
            client.isAlive = true;
        });
        client.once('close', () => {
            void this.handleDisconnect(client);
        });
        client.once('error', () => {
            client.close();
        });
        try {
            if (wasOffline) {
                await this.presenceService.setUserOnline(userId);
                await this.broadcastPresenceToFriends({
                    type: 'presence:update',
                    userId,
                    isOnline: true,
                    lastSeenAt: null,
                });
            }
            this.sendJson(client, {
                type: 'presence:connected',
                userId,
                isOnline: true,
            });
            this.logger.log(`User ${userId} connected to presence`);
        }
        catch (error) {
            this.logger.error(`Failed to handle presence connection for user ${userId}`, error);
            sockets.delete(client);
            if (sockets.size === 0) {
                this.userSockets.delete(userId);
            }
            client.close(1011, 'Presence error');
        }
    }
    async handleDisconnect(client) {
        const userId = client.userId;
        if (!userId) {
            return;
        }
        const sockets = this.userSockets.get(userId);
        if (!sockets) {
            return;
        }
        sockets.delete(client);
        if (sockets.size > 0) {
            return;
        }
        this.userSockets.delete(userId);
        const lastSeenAt = new Date();
        try {
            await this.presenceService.setUserOffline(userId, lastSeenAt);
            await this.broadcastPresenceToFriends({
                type: 'presence:update',
                userId,
                isOnline: false,
                lastSeenAt: lastSeenAt.toISOString(),
            });
            this.logger.log(`User ${userId} disconnected from presence`);
        }
        catch (error) {
            this.logger.error(`Failed to handle presence disconnection for user ${userId}`, error);
        }
    }
    async broadcastPresenceToFriends(payload) {
        const friendIds = await this.presenceService.getAcceptedFriendIds(payload.userId);
        for (const friendId of friendIds) {
            const sockets = this.userSockets.get(friendId);
            if (!sockets) {
                continue;
            }
            for (const socket of sockets) {
                this.sendJson(socket, payload);
            }
        }
    }
    async onModuleDestroy() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        await this.presenceService.setAllUsersOffline();
        for (const sockets of this.userSockets.values()) {
            for (const socket of sockets) {
                socket.close(1001, 'Server shutting down');
            }
        }
        this.userSockets.clear();
        this.webSocketServer?.close();
        this.webSocketServer = null;
    }
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            for (const sockets of this.userSockets.values()) {
                for (const socket of sockets) {
                    if (socket.isAlive === false) {
                        socket.terminate();
                        continue;
                    }
                    socket.isAlive = false;
                    socket.ping();
                }
            }
        }, 30000);
    }
    extractToken(request, url) {
        const authorizationHeader = request.headers.authorization;
        if (authorizationHeader &&
            authorizationHeader.startsWith('Bearer ')) {
            return authorizationHeader.slice('Bearer '.length);
        }
        return url.searchParams.get('token');
    }
    sendJson(client, payload) {
        if (client.readyState !== ws_1.WebSocket.OPEN) {
            return;
        }
        client.send(JSON.stringify(payload));
    }
    rejectUpgrade(socket, statusCode, message) {
        socket.write(`HTTP/1.1 ${statusCode} ${message}\r\n\r\n`);
        socket.destroy();
    }
};
exports.PresenceGateway = PresenceGateway;
exports.PresenceGateway = PresenceGateway = PresenceGateway_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        presence_service_1.PresenceService])
], PresenceGateway);
