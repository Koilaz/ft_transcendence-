import {
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type {
  IncomingMessage,
  Server as HttpServer,
} from 'http';
import type { Duplex } from 'stream';
import {
  WebSocket,
  WebSocketServer,
} from 'ws';

import { PresenceService } from './presence.service';

type JwtPayload = {
  sub: number;
  username: string;
};

type AuthenticatedWebSocket = WebSocket & {
  userId?: number;
  isAlive?: boolean;
};

type PresenceUpdatePayload = {
  type: 'presence:update';
  userId: number;
  isOnline: boolean;
  lastSeenAt: string | null;
};

@Injectable()
export class PresenceGateway implements OnModuleDestroy {
  private readonly logger = new Logger(PresenceGateway.name);

  private webSocketServer: WebSocketServer | null = null;

  private heartbeatInterval: ReturnType<typeof setInterval> | null =
    null;

  private readonly userSockets = new Map<
    number,
    Set<AuthenticatedWebSocket>
  >();

  constructor(
    private readonly jwtService: JwtService,
    private readonly presenceService: PresenceService,
  ) {}

  async attach(server: HttpServer): Promise<void> {
    if (this.webSocketServer) {
      return;
    }

    await this.presenceService.setAllUsersOffline();

    this.webSocketServer = new WebSocketServer({
      noServer: true,
    });

    server.on('upgrade', (request, socket, head) => {
      void this.handleUpgrade(request, socket, head);
    });

    this.webSocketServer.on(
      'connection',
      (client: WebSocket) => {
        void this.handleConnection(
          client as AuthenticatedWebSocket,
        );
      },
    );

    this.startHeartbeat();

    this.logger.log('Presence WebSocket attached on /ws/presence');
  }

  async handleUpgrade(
    request: IncomingMessage,
    socket: Duplex,
    head: Buffer,
  ): Promise<void> {
    try {
      const url = new URL(
        request.url ?? '',
        `https://${request.headers.host ?? 'localhost'}`,
      );

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
        const payload =
          await this.jwtService.verifyAsync<JwtPayload>(token);

        if (!Number.isInteger(payload.sub)) {
          this.rejectUpgrade(socket, 401, 'Unauthorized');
          return;
        }

        this.webSocketServer?.handleUpgrade(
          request,
          socket,
          head,
          (client: WebSocket) => {
            const authenticatedClient =
              client as AuthenticatedWebSocket;

            authenticatedClient.userId = payload.sub;
            authenticatedClient.isAlive = true;

            this.webSocketServer?.emit(
              'connection',
              authenticatedClient,
              request,
            );
          },
        );
      } catch {
        this.rejectUpgrade(socket, 401, 'Unauthorized');
      }
    } catch (error) {
      this.logger.error('Failed to handle presence upgrade', error);
      this.rejectUpgrade(socket, 400, 'Bad Request');
    }
  }

  async handleConnection(
    client: AuthenticatedWebSocket,
  ): Promise<void> {
    const userId = client.userId;

    if (!userId) {
      client.close(1008, 'Unauthorized');
      return;
    }

    let sockets = this.userSockets.get(userId);
    const wasOffline = !sockets || sockets.size === 0;

    if (!sockets) {
      sockets = new Set<AuthenticatedWebSocket>();
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
    } catch (error) {
      this.logger.error(
        `Failed to handle presence connection for user ${userId}`,
        error,
      );

      sockets.delete(client);

      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }

      client.close(1011, 'Presence error');
    }
  }

  async handleDisconnect(
    client: AuthenticatedWebSocket,
  ): Promise<void> {
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
      await this.presenceService.setUserOffline(
        userId,
        lastSeenAt,
      );

      await this.broadcastPresenceToFriends({
        type: 'presence:update',
        userId,
        isOnline: false,
        lastSeenAt: lastSeenAt.toISOString(),
      });

      this.logger.log(`User ${userId} disconnected from presence`);
    } catch (error) {
      this.logger.error(
        `Failed to handle presence disconnection for user ${userId}`,
        error,
      );
    }
  }

  async broadcastPresenceToFriends(
    payload: PresenceUpdatePayload,
  ): Promise<void> {
    const friendIds =
      await this.presenceService.getAcceptedFriendIds(
        payload.userId,
      );

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

  async onModuleDestroy(): Promise<void> {
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

  private startHeartbeat(): void {
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

  private extractToken(
    request: IncomingMessage,
    url: URL,
  ): string | null {
    const authorizationHeader =
      request.headers.authorization;

    if (
      authorizationHeader &&
      authorizationHeader.startsWith('Bearer ')
    ) {
      return authorizationHeader.slice('Bearer '.length);
    }

    return url.searchParams.get('token');
  }

  private sendJson(
    client: WebSocket,
    payload: unknown,
  ): void {
    if (client.readyState !== WebSocket.OPEN) {
      return;
    }

    client.send(JSON.stringify(payload));
  }

  private rejectUpgrade(
    socket: Duplex,
    statusCode: number,
    message: string,
  ): void {
    socket.write(
      `HTTP/1.1 ${statusCode} ${message}\r\n\r\n`,
    );
    socket.destroy();
  }
}
