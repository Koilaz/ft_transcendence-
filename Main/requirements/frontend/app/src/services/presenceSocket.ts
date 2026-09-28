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

// La socket appartient a App.tsx et vit toute la duree de la session : les
// pages ne font que s'abonner ici, jamais connecter ni fermer. Quitter la
// page Friends ne deconnecte donc plus le joueur du point de vue presence.
const listeners = new Set<PresenceMessageHandler>();

export function subscribePresence(onMessage: PresenceMessageHandler): () => void {
  listeners.add(onMessage);
  return () => {
    listeners.delete(onMessage);
  };
}

function getPresenceWebSocketUrl(accessToken: string): string {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';

  return `${protocol}://${window.location.host}/ws/presence?token=${encodeURIComponent(
    accessToken,
  )}`;
}

export function connectPresenceSocket(
  accessToken: string,
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

      for (const onMessage of listeners) {
        onMessage(message);
      }
    } catch {
      // Message invalide : on ignore.
    }
  });

  return socket;
}
