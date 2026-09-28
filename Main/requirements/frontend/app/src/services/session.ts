// Le token d'acces est l'unique verite de session : chaque ecriture passe
// ici, pour prevenir l'onglet courant (evenement DOM) ET les autres onglets
// (evenement storage). C'est ce qui permet a App de posseder la socket de
// presence et de l'ouvrir ou la fermer au bon moment, dans chaque onglet.
const SESSION_CHANGED_EVENT = 'session:changed';

export function getAccessToken(): string | null {
  return localStorage.getItem('accessToken');
}

export function setAccessToken(accessToken: string | null): void {
  if (accessToken) {
    localStorage.setItem('accessToken', accessToken);
  } else {
    localStorage.removeItem('accessToken');
  }

  // L'evenement storage ne se declenche que dans les autres onglets.
  window.dispatchEvent(new Event(SESSION_CHANGED_EVENT));
}

export function subscribeSession(onChange: () => void): () => void {
  function onStorage(event: StorageEvent) {
    if (event.storageArea === localStorage
      && (event.key === 'accessToken' || event.key === null)) {
      onChange();
    }
  }

  window.addEventListener(SESSION_CHANGED_EVENT, onChange);
  window.addEventListener('storage', onStorage);

  return () => {
    window.removeEventListener(SESSION_CHANGED_EVENT, onChange);
    window.removeEventListener('storage', onStorage);
  };
}
