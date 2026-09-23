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

  // L'événement storage ne se déclenche que dans les autres onglets.
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
