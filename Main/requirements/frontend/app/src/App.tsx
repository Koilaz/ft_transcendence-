// @ts-nocheck
import { useEffect, useSyncExternalStore } from 'react';
import AppRouter from './router/AppRouter';
import { ModalProvider } from './contexts/ModalContext';
import GlobalModals from './components/GlobalModals';
import { connectPresenceSocket } from './services/presenceSocket';
import { getAccessToken, subscribeSession } from './services/session';

function App() {
  // Suit le token depuis session.ts : connexion, deconnexion ou changement
  // dans un autre onglet reagit immediatement, sans recharger la page.
  const accessToken = useSyncExternalStore(subscribeSession, getAccessToken);

  useEffect(() => {
    // La socket de presence appartient a l'application, pas a une page :
    // le joueur reste en ligne tant que sa session vit, sur tout le site.
    if (!accessToken) return;

    const socket = connectPresenceSocket(accessToken);
    return () => socket.close(1000, 'Session ended');
  }, [accessToken]);

  return (
    <ModalProvider>
      <GlobalModals />
      <AppRouter />
    </ModalProvider>
  );
}

export default App;
