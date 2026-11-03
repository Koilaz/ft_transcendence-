const routes = new Set(['/', '/login', '/register', '/profile', '/friends', '/game',
  '/privacy-policy', '/terms-of-service']);

export function pageRoute(pathname: string): string {
  return routes.has(pathname) ? pathname : 'not-found';
}

// Navigation within a React app has no document GET. Record a distinct page
// view; never invent an HTTP 200 or send queries, identifiers or page content.
export function createNavigationTracker(send = (route: string) => {
  void fetch('/api/telemetry/pageview', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ route }), keepalive: true,
  }).catch(() => { /* Monitoring must not block navigation. */ });
}) {
  let previousPath: string | undefined;
  return (pathname: string): void => {
    if (pathname === previousPath) return; // includes React StrictMode effect replay
    previousPath = pathname;
    send(pageRoute(pathname));
  };
}
