import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

// Le frontend utilise Node 20 : son runtime ne charge pas encore TypeScript.
// Ces deux modules n'ont que des imports de types, effaces a la compilation.
async function loadTypeScript(path) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}

const { connectGameSocket, getClosedGameCode } = await loadTypeScript('../src/services/gameSocket.ts');
const { gameReducer, initialState } = await loadTypeScript('../src/services/gameState.ts');

const roomState = {
  type: 'state', status: 'playing', players: 4, room_number: 12,
  countdown: 17, current_manche: 2, max_manches: 3,
};
const snapshot = {
  type: 'reconnected', state: roomState, character: 'Alice',
  history: [{ sender: 'Systeme', text: 'Sujet' }, { sender: 'Bob', text: 'Bonjour' }],
  turn: { type: 'turn', character: 'Alice', countdown: 9, turnCycle: 2, turnOrder: ['Alice', 'Bob', 'Chloe'], totalTurns: 3 },
  roundPhase: 'chatting', hasVoted: true, disconnectedCharacters: ['Bob'],
  leftCharacters: [], debriefWaiting: false,
};

function browser(t) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const originals = new Map(['window', 'localStorage', 'sessionStorage', 'WebSocket'].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const storage = () => {
    const values = new Map();
    return {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    };
  };
  class Socket extends EventTarget {
    static OPEN = 1;
    static instances = [];
    readyState = 0;
    sent = [];
    constructor(url) {
      super();
      this.url = url;
      Socket.instances.push(this);
    }
    emit(type, values = {}) {
      this.dispatchEvent(Object.assign(new Event(type), values));
    }
    open() { this.readyState = 1; this.emit('open'); }
    receive(message) { this.emit('message', { data: JSON.stringify(message) }); }
    close(code = 1000) { this.readyState = 3; this.emit('close', { code }); }
    send(message) {
      assert.equal(this.readyState, 1);
      this.sent.push(JSON.parse(message));
    }
  }
  globalThis.window = Object.assign(new EventTarget(), { location: { protocol: 'https:', host: 'example.test' } });
  globalThis.localStorage = storage();
  globalThis.sessionStorage = storage();
  globalThis.WebSocket = Socket;
  const connections = [];
  t.after(() => {
    for (const connection of connections) connection.dispose();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  const messages = [];
  const statuses = [];
  const start = () => {
    const connection = connectGameSocket((message) => messages.push(message), (status) => statuses.push(status));
    connections.push(connection);
    return connection;
  };
  const open = (socket = Socket.instances.at(-1)) => {
    socket.open();
    socket.receive({ type: 'session', token: 'secret-per-tab' });
    socket.receive(roomState);
    return socket;
  };
  return { Socket, messages, statuses, start, open, tick: (time) => t.mock.timers.tick(time) };
}

test('StrictMode cleanup creates only one live connection and ignores stale messages', (t) => {
  const b = browser(t);
  b.start().dispose();
  const active = b.start();
  b.tick(0);
  assert.equal(b.Socket.instances.length, 1);
  const old = b.open();
  active.dispose();
  old.receive({ type: 'session', token: 'stale-token' });
  old.receive({ type: 'chat', sender: 'Bob', text: 'stale message' });
  old.emit('error');
  b.tick(30000);
  assert.equal(sessionStorage.getItem('gameResumeToken'), 'secret-per-tab');
  assert.equal(b.messages.length, 1);
  assert.equal(b.Socket.instances.length, 1);
});

test('unexpected close retries with the saved token and capped exponential backoff', (t) => {
  const b = browser(t);
  b.start();
  b.tick(0);
  b.open().close(1006);
  for (const delay of [500, 1000, 2000, 4000, 5000, 5000]) {
    const count = b.Socket.instances.length;
    b.tick(delay - 1);
    assert.equal(b.Socket.instances.length, count);
    b.tick(1);
    assert.equal(b.Socket.instances.length, count + 1);
    const socket = b.Socket.instances.at(-1);
    assert.equal(new URL(socket.url).searchParams.get('resumeToken'), 'secret-per-tab');
    socket.close(1006);
  }
  assert.equal(b.statuses.at(-1), 'reconnecting');
});

test('transport errors retry once and restore only after the server snapshot', (t) => {
  const b = browser(t);
  b.start();
  b.tick(0);
  const old = b.open();
  old.emit('error');
  b.tick(500);
  const resumed = b.Socket.instances.at(-1);
  resumed.open();
  assert.equal(b.statuses.at(-1), 'reconnecting');
  old.receive({ type: 'roomClosed', code: 'not_enough_players' });
  resumed.receive(snapshot);
  assert.equal(b.statuses.at(-1), 'connected');
  assert.deepEqual(b.messages.at(-1), snapshot);
  assert.equal(getClosedGameCode(), null);
  b.tick(15000);
  assert.equal(b.Socket.instances.length, 2);
});

test('blocked handshakes time out and browser online retries immediately', (t) => {
  const b = browser(t);
  b.start();
  b.tick(0);
  b.tick(10000);
  assert.equal(b.statuses.at(-1), 'reconnecting');
  window.dispatchEvent(new Event('online'));
  assert.equal(b.Socket.instances.length, 2);
  b.open();
  b.tick(15000);
  assert.equal(b.Socket.instances.length, 2);
});

test('a page in the back-forward cache waits for pageshow before reconnecting', (t) => {
  const b = browser(t);
  b.start();
  b.tick(0);
  b.open();
  window.dispatchEvent(new Event('pagehide'));
  b.tick(30000);
  window.dispatchEvent(new Event('online'));
  assert.equal(b.Socket.instances.length, 1);
  window.dispatchEvent(new Event('pageshow'));
  assert.equal(b.Socket.instances.length, 2);
  assert.equal(new URL(b.Socket.instances.at(-1).url).searchParams.get('resumeToken'), 'secret-per-tab');
});

test('expired resume clears its token, stops retries and allows explicit replay on the live socket', (t) => {
  const b = browser(t);
  sessionStorage.setItem('gameResumeToken', 'expired');
  const connection = b.start();
  b.tick(0);
  const socket = b.open();
  socket.receive({ type: 'roomClosed', code: 'reconnect_expired' });
  assert.equal(sessionStorage.getItem('gameResumeToken'), null);
  assert.equal(getClosedGameCode(), 'reconnect_expired');
  b.tick(30000);
  assert.equal(b.Socket.instances.length, 1);
  connection.replay();
  assert.deepEqual(socket.sent, [{ type: 'replay' }]);
  socket.receive({ type: 'session', token: 'new-session' });
  assert.equal(sessionStorage.getItem('gameResumeToken'), 'new-session');
  assert.equal(getClosedGameCode(), null);
});

test('session takeover never retries, including on refresh, until explicit replay', (t) => {
  const b = browser(t);
  const oldPage = b.start();
  b.tick(0);
  b.open().close(4001);
  b.tick(30000);
  assert.equal(b.Socket.instances.length, 1);
  assert.equal(sessionStorage.getItem('gameResumeToken'), null);
  assert.equal(getClosedGameCode(), 'session_replaced');
  oldPage.dispose();
  const nextPage = b.start();
  b.tick(30000);
  assert.equal(b.Socket.instances.length, 1);
  nextPage.replay();
  assert.equal(b.Socket.instances.length, 2);
  assert.equal(new URL(b.Socket.instances.at(-1).url).searchParams.has('resumeToken'), false);
});

test('replay on a silently broken open socket waits for confirmation then retries', (t) => {
  const b = browser(t);
  const connection = b.start();
  b.tick(0);
  const socket = b.open();
  socket.receive({ type: 'roomClosed', code: 'reconnect_expired' });
  window.dispatchEvent(new Event('offline'));
  assert.equal(socket.readyState, b.Socket.OPEN);
  connection.replay();
  assert.deepEqual(socket.sent, [{ type: 'replay' }]);
  assert.equal(b.statuses.at(-1), 'connecting');
  b.tick(10000);
  assert.equal(b.statuses.at(-1), 'reconnecting');
  b.tick(500);
  assert.equal(b.Socket.instances.length, 2);
  b.open();
  assert.equal(b.statuses.at(-1), 'connected');
});

test('refreshing a final outcome cannot silently join a new game', (t) => {
  const b = browser(t);
  const oldPage = b.start();
  b.tick(0);
  const socket = b.open();
  socket.receive({ type: 'gameEnd', ranking: [], winnerId: 'Alice', history: [] });
  socket.close(1006);
  oldPage.dispose();
  const nextPage = b.start();
  b.tick(30000);
  assert.equal(b.Socket.instances.length, 1);
  assert.equal(getClosedGameCode(), 'game_finished');
  nextPage.replay();
  assert.equal(b.Socket.instances.length, 2);
});

test('resuming atomically restores vote, identity, timer and history without duplicates', () => {
  const previous = gameReducer(initialState, { type: 'chat', sender: 'Bob', text: 'Bonjour' });
  const once = gameReducer(previous, snapshot);
  const twice = gameReducer(once, snapshot);
  assert.equal(twice.messages.length, 2);
  assert.equal(twice.messages[0].kind, 'system');
  assert.equal(twice.messages[1].kind, 'chat');
  assert.equal(twice.myCharacter, 'Alice');
  assert.equal(twice.currentTurnCharacter, 'Alice');
  assert.equal(twice.countdown, 9);
  assert.equal(twice.hasVoted, true);
  assert.deepEqual(twice.turnOrder, ['Alice', 'Bob', 'Chloe']);
  assert.deepEqual(twice.disconnectedCharacters, ['Bob']);
  assert.deepEqual(twice.leftCharacters, []);
});

test('a snapshot without an active turn uses the room countdown and transition phase', () => {
  const restored = gameReducer(initialState, {
    ...snapshot, turn: null, state: { ...roomState, status: 'transition' },
    roundPhase: 'resolution', debriefWaiting: true,
  });
  assert.equal(restored.currentTurnCharacter, null);
  assert.equal(restored.countdown, 17);
  assert.equal(restored.roundPhase, 'resolution');
  assert.equal(restored.roomStatus, 'transition');
  assert.equal(restored.debriefWaiting, true);
});

test('temporary absences preserve voting eligibility and disappear on return or the next round', () => {
  const absent = gameReducer(initialState, { type: 'playerDisconnected', character: 'Bob', temporary: true });
  assert.deepEqual(absent.leftCharacters, []);
  assert.deepEqual(absent.disconnectedCharacters, ['Bob']);
  const back = gameReducer(absent, { type: 'playerReconnected', character: 'Bob' });
  assert.deepEqual(back.disconnectedCharacters, []);
  const next = gameReducer(absent, { type: 'assignment', character: 'Chloe' });
  assert.deepEqual(next.disconnectedCharacters, []);
});
