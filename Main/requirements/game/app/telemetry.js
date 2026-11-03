import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

function sendLog(event) {
  const log = { service: 'game', level: 'info', timestamp: new Date().toISOString(), ...event };
  console.log(JSON.stringify(log));
  fetch(process.env.LOGSTASH_URL ?? 'http://logstash:5000', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(log), signal: AbortSignal.timeout(3000),
  }).then(async (response) => {
    await response.body?.cancel();
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  }).catch((error) => console.error(`[telemetry] Logstash: ${error.message}`));
}

export function createTelemetry({ log = sendLog } = {}) {
  const registry = new Registry();
  collectDefaultMetrics({ register: registry });
  const requests = new Counter({ name: 'http_requests_total', help: 'Completed game HTTP requests',
    labelNames: ['method', 'route', 'status'], registers: [registry] });
  const duration = new Histogram({ name: 'http_request_duration_seconds', help: 'Game HTTP response duration in seconds',
    labelNames: ['method', 'route', 'status'], registers: [registry] });
  const connections = new Gauge({ name: 'game_websocket_connections', help: 'Open game WebSocket connections', registers: [registry] });
  const opened = new Counter({ name: 'game_websocket_connections_total', help: 'Accepted game WebSocket connections', registers: [registry] });
  const messages = new Counter({ name: 'game_websocket_messages_total', help: 'Game WebSocket messages',
    labelNames: ['direction'], registers: [registry] });
  messages.inc({ direction: 'received' }, 0);
  messages.inc({ direction: 'sent' }, 0);

  function http(request, response, next) {
    if (request.path === '/metrics') return next();
    const start = process.hrtime.bigint();
    response.once('finish', () => {
      const seconds = Number(process.hrtime.bigint() - start) / 1e9;
      const route = typeof request.route?.path === 'string' ? request.route.path : 'unmatched';
      const labels = { method: request.method, route, status: String(response.statusCode) };
      requests.inc(labels);
      duration.observe(labels, seconds);
      log({ message: 'HTTP request', method: request.method, route,
        status: response.statusCode, duration_ms: seconds * 1000 });
    });
    next();
  }

  function websocket(wss) {
    // Attach before the game's connection listener so initial session/state
    // messages are counted too. Never record payloads, names or URL tokens.
    wss.on('connection', (socket) => {
      connections.inc();
      opened.inc();
      // event is reserved by Logstash's ECS codec (event.original).
      const event = (action) => log({ message: 'WebSocket activity', event_type: action, route: '/ws/game' });
      event('connected');
      socket.on('message', () => {
        messages.inc({ direction: 'received' });
        event('message_received');
      });
      const send = socket.send;
      socket.send = function (...args) {
        const open = this.readyState === this.OPEN;
        const result = send.apply(this, args);
        if (open) {
          messages.inc({ direction: 'sent' });
          event('message_sent');
        }
        return result;
      };
      socket.once('close', () => { connections.dec(); event('disconnected'); });
    });
  }

  async function metrics(_request, response, next) {
    try { response.type(registry.contentType).send(await registry.metrics()); }
    catch (error) { next(error); }
  }
  return { http, websocket, metrics, registry };
}
