import assert from 'node:assert/strict';
import { once } from 'node:events';
import http from 'node:http';
import express from 'express';
import { WebSocket, WebSocketServer } from 'ws';
import { createTelemetry } from '../telemetry.js';

// Real HTTP/WebSocket transports, no agents, sessions, database or external logs.
const logs = [];
const telemetry = createTelemetry({ log: (event) => logs.push(event) });
const app = express();
app.use(telemetry.http);
app.get('/metrics', telemetry.metrics);
app.get('/ws/game', (_req, res) => res.status(204).end());
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/game' });
telemetry.websocket(wss);
wss.on('connection', socket => {
  socket.send(JSON.stringify({ type: 'session', token: 'private-session-token' }));
  socket.on('message', () => socket.send('reply'));
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const url = `http://127.0.0.1:${server.address().port}`;
let client;
try {
  for (const [path, status] of [['/ws/game?token=private-token', 204], ['/missing?token=private-token', 404], ['/metrics?token=private-token', 200]]) {
    const response = await fetch(url + path);
    await response.text();
    assert.equal(response.status, status);
  }
  client = new WebSocket(url.replace('http:', 'ws:') + '/ws/game?token=private-token');
  const first = once(client, 'message');
  await once(client, 'open');
  await first;
  assert.match(await telemetry.registry.metrics(), /^game_websocket_connections 1$/m);
  const reply = once(client, 'message');
  client.send('private-chat-content');
  await reply;
  const closed = once(client, 'close');
  client.close();
  await closed;
  // Allow the server-side close event to run too.
  for (let i = 0; i < 20 && !logs.some(e => e.event_type === 'disconnected'); i++)
    await new Promise(resolve => setTimeout(resolve, 5));
  const metrics = await telemetry.registry.metrics();
  assert.match(metrics, /^game_websocket_connections 0$/m);
  assert.match(metrics, /^game_websocket_connections_total 1$/m);
  assert.match(metrics, /^game_websocket_messages_total\{direction="received"\} 1$/m);
  assert.match(metrics, /^game_websocket_messages_total\{direction="sent"\} 2$/m);
  assert.equal(logs.filter(e => e.message === 'HTTP request').length, 2);
  assert.deepEqual(logs.filter(e => e.message === 'HTTP request').map(e => e.status), [204, 404]);
  assert.ok(logs.filter(e => e.message === 'WebSocket activity').every(e => typeof e.event_type === 'string' && !('event' in e)));
  assert.doesNotMatch(JSON.stringify(logs) + metrics, /private-token|private-chat-content|private-session-token/);
  console.log('PASS HTTP status, WebSocket connection/message metrics, close cleanup and secret redaction');
} finally {
  client?.terminate();
  for (const socket of wss.clients) socket.terminate();
  await new Promise(resolve => wss.close(resolve));
  await new Promise(resolve => server.close(resolve));
}
