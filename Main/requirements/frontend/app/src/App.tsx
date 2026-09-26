import { useEffect, useSyncExternalStore } from 'react';
import AppRouter from './router/AppRouter';
import { connectPresenceSocket } from './services/presenceSocket';
import { getAccessToken, subscribeSession } from './services/session';

function App() {
  const accessToken = useSyncExternalStore(subscribeSession, getAccessToken);

  useEffect(() => {
    if (!accessToken) return;

    const socket = connectPresenceSocket(accessToken);
    return () => socket.close(1000, 'Session ended');
  }, [accessToken]);

  return <AppRouter />;
}

export default App;
