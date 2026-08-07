export type PresenceConnectedMessage = {
  type: 'presence:connected';
  userId: number;
  isOnline: true;
};

export type PresenceUpdateMessage = {
  type: 'presence:update';
  userId: number;
  isOnline: boolean;
  lastSeenAt: string | null;
};

export type PresenceMessage =
  | PresenceConnectedMessage
  | PresenceUpdateMessage;

export type PresenceMessageHandler = (
  message: PresenceMessage,
) => void;

function getPresenceWebSocketUrl(accessToken: string): string {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';

  return `${protocol}://${window.location.host}/ws/presence?token=${encodeURIComponent(
    accessToken,
  )}`;
}

export function connectPresenceSocket(
  accessToken: string,
  onMessage: PresenceMessageHandler,
): WebSocket {
  const socket = new WebSocket(
    getPresenceWebSocketUrl(accessToken),
  );

  socket.addEventListener('message', (event) => {
    try {
      const message = JSON.parse(event.data) as PresenceMessage;

      if (
        message.type !== 'presence:connected' &&
        message.type !== 'presence:update'
      ) {
        return;
      }

      onMessage(message);
    } catch {
      // Message invalide : on ignore.
    }
  });

  return socket;
}