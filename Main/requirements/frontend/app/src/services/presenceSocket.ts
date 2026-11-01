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

// Singleton + fermeture differee. En dev, StrictMode monte, demonte puis
// remonte aussitot chaque composant : fermer la socket au demontage la
// tuerait pendant son etablissement, et le navigateur loggue alors deux
// erreurs rouges (« WebSocket is closed before the connection is
// established » / « connexion interrompue pendant le chargement de la
// page »). La fermeture est donc differee : un remontage immediat
// (StrictMode) l'annule et reutilise la socket vivante, un vrai depart
// (deconnexion, changement de token) la laisse se produire.
let socket: WebSocket | null = null;
let currentToken: string | null = null;
let closeTimer: ReturnType<typeof setTimeout> | null = null;

function getPresenceWebSocketUrl(accessToken: string): string {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';

  return `${protocol}://${window.location.host}/ws/presence?token=${encodeURIComponent(
    accessToken,
  )}`;
}

export function connectPresenceSocket(
  accessToken: string,
): WebSocket {
  // Un remontage annule la fermeture programmee par le cleanup precedent.
  if (closeTimer !== null) {
    clearTimeout(closeTimer);
    closeTimer = null;
  }

  // Meme session : on reutilise la socket, ouverte ou en cours d'ouverture.
  if (
    socket &&
    currentToken === accessToken &&
    (socket.readyState === WebSocket.OPEN ||
      socket.readyState === WebSocket.CONNECTING)
  ) {
    return socket;
  }

  // Session differente : l'ancienne socket n'est plus la bonne.
  socket?.close(1000, 'Replaced');
  currentToken = accessToken;
  socket = new WebSocket(
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

// Appele par le cleanup de App.tsx. Ne ferme pas tout de suite : en dev,
// StrictMode redemonte le composant aussitot et connectPresenceSocket
// annule alors la fermeture. La socket closee est comparee au singleton :
// un cleanup d'une session deja remplacee ne doit pas tuer la nouvelle.
export function schedulePresenceClose(closed: WebSocket): void {
  if (!socket || socket !== closed || closeTimer !== null)
    return;

  closeTimer = setTimeout(() => {
    socket?.close(1000, 'Session ended');
    socket = null;
    currentToken = null;
    closeTimer = null;
  }, 250);
}
