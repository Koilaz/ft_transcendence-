import assert from 'node:assert/strict';
import { once } from 'node:events';
import { WebSocket, WebSocketServer } from 'ws';
import { attachGameConnections } from '../gameConnections.js';

// De vraies sockets, avec une file et une room controlees : aucun LLM ni
// delai de manche ne masque les courses entre close, reprise et expiration.
const wss = new WebSocketServer({ port: 0, host: '127.0.0.1' });
const waiting = new Map();
const clients = new Set();
const accounts = new Map([
	['alice', { userId: 7, username: 'Alice' }],
	['alice-renamed', { userId: 7, username: 'Nouveau pseudo' }],
	['bob', { userId: 8, username: 'Bob' }],
]);

function queueState(entry)
{
	entry.sendFn({ type: 'state', status: 'waiting', ready: entry.ready });
}

attachGameConnections(wss, {
	enqueue(id, sendFn, joined, displayName) {
		const entry = { id, sendFn, joined, displayName, ready: false };
		waiting.set(id, entry);
		queueState(entry);
	},
	dequeue: (id) => waiting.delete(id),
	ready(id) {
		const entry = waiting.get(id);
		if (entry) {
			entry.ready = true;
			queueState(entry);
		}
	},
	verifyToken: (token) => accounts.get(token) ?? null,
	queuedSessionTtlMs: 80,
	heartbeatMs: 100,
	logger: { log() {}, error() {} },
});
await once(wss, 'listening');
const url = `ws://127.0.0.1:${wss.address().port}`;

async function until(predicate)
{
	const limit = Date.now() + 2000;
	while (!predicate())
	{
		assert.ok(Date.now() < limit, 'Evenement WebSocket attendu');
		await new Promise((resolve) => setTimeout(resolve, 5));
	}
}

async function connect(params = {}, options = {})
{
	const socket = new WebSocket(`${url}/?${new URLSearchParams(params)}`, options);
	const client = { socket, messages: [] };
	clients.add(client);
	socket.on('message', (data) => client.messages.push(JSON.parse(data.toString())));
	await once(socket, 'open');
	await until(() => client.messages.some((msg) => msg.type === 'session'));
	client.token = client.messages.find((msg) => msg.type === 'session').token;
	return client;
}

async function close(client)
{
	if (client.socket.readyState === WebSocket.CLOSED)
		return;
	const closed = once(client.socket, 'close');
	client.socket.close();
	await closed;
	await new Promise((resolve) => setImmediate(resolve));
}

function serverSocket(client)
{
	return [...wss.clients].find((socket) => socket._socket.remotePort === client.socket._socket.localPort);
}

function putInRoom(client)
{
	const id = serverSocket(client).playerId;
	const entry = waiting.get(id);
	assert.ok(entry);
	waiting.delete(id);
	const room = {
		id: 42,
		entry,
		disconnections: [],
		reconnections: [],
		messages: [],
		votes: [],
		acceptResume: true,
		disconnectPlayer(playerId) { this.disconnections.push(playerId); },
		reconnectPlayer(playerId, sendFn) {
			this.reconnections.push(playerId);
			if (!this.acceptResume)
				return false;
			entry.sendFn = sendFn;
			sendFn({ type: 'reconnected', playerId });
			return true;
		},
		addMessage(playerId, text) { this.messages.push({ playerId, text }); },
		submitVote(playerId, target) { this.votes.push({ playerId, target }); },
	};
	entry.joined(room);
	return room;
}

try
{
	// Un invite retrouve son identite dans le lobby et doit confirmer Pret.
	const guest = await connect({ name: '  Ada\u0000  ' });
	const guestId = serverSocket(guest).playerId;
	assert.match(guest.token, /^[A-Za-z0-9_-]{43}$/);
	assert.equal(waiting.get(guestId).displayName, 'Ada');
	guest.socket.send(JSON.stringify({ type: 'ready' }));
	await until(() => waiting.get(guestId).ready);
	await close(guest);
	await until(() => !waiting.has(guestId));
	const resumed = await connect({ name: 'Autre pseudo', resumeToken: guest.token });
	assert.equal(serverSocket(resumed).playerId, guestId);
	assert.equal(resumed.token, guest.token);
	assert.equal(waiting.get(guestId).displayName, 'Ada');
	assert.equal(waiting.get(guestId).ready, false);

	// Une absence en partie conserve le joueur ; la reprise restaure sa room.
	const room = putInRoom(resumed);
	await close(resumed);
	await until(() => room.disconnections.length === 1);
	room.entry.sendFn({ type: 'chat', text: 'Pendant la coupure' });
	const inGame = await connect({ resumeToken: resumed.token });
	assert.deepEqual(room.reconnections, [guestId]);
	assert.equal(waiting.size, 0);
	assert.ok(inGame.messages.some((msg) => msg.type === 'reconnected'));
	inGame.socket.send(JSON.stringify({ type: 'chat', text: ` ${'x'.repeat(550)} ` }));
	inGame.socket.send(JSON.stringify({ type: 'vote', targetCharacter: 'Caporal Mayo' }));
	await until(() => room.votes.length === 1);
	assert.deepEqual(room.messages, [{ playerId: guestId, text: 'x'.repeat(500) }]);
	assert.deepEqual(room.votes, [{ playerId: guestId, target: 'Caporal Mayo' }]);

	// Un refresh peut arriver avant close. L'ancienne socket perd tous ses droits.
	const obsoleteServer = serverSocket(inGame);
	const replaced = once(inGame.socket, 'close');
	const takeover = await connect({ resumeToken: inGame.token });
	assert.equal((await replaced)[0], 4001);
	assert.equal(room.disconnections.length, 1);
	obsoleteServer.emit('message', Buffer.from(JSON.stringify({ type: 'chat', text: 'obsolete' })));
	obsoleteServer.emit('close');
	assert.equal(room.messages.length, 1);
	assert.equal(room.disconnections.length, 1);
	room.entry.sendFn({ type: 'chat', text: 'Nouvelle socket seulement' });
	await until(() => takeover.messages.some((msg) => msg.text === 'Nouvelle socket seulement'));

	// La fin de manche invalide la session meme pendant l'absence du joueur.
	await close(takeover);
	await until(() => room.disconnections.length === 2);
	room.entry.sendFn({ type: 'roomClosed', code: 'reconnect_expired' });
	const expired = await connect({ resumeToken: takeover.token });
	assert.notEqual(expired.token, takeover.token);
	assert.ok(expired.messages.some((msg) => msg.code === 'reconnect_expired'));
	assert.equal(waiting.size, 0);
	expired.socket.send(JSON.stringify({ type: 'replay' }));
	await until(() => waiting.size === 1);
	const replaySessions = expired.messages.filter((msg) => msg.type === 'session');
	assert.equal(replaySessions.length, 2);
	assert.notEqual(replaySessions[0].token, replaySessions[1].token);
	await close(expired);
	await until(() => waiting.size === 0);

	// Le compte signe est obligatoire pour reprendre sa session ; le nom ne
	// l'est pas. Une tentative invalide ne deconnecte pas le titulaire.
	const alice = await connect({ token: 'alice' });
	const aliceRoom = putInRoom(alice);
	for (const token of ['bob', 'expired-jwt'])
	{
		const intruder = await connect({ token, resumeToken: alice.token });
		assert.ok(intruder.messages.some((msg) => msg.code === 'reconnect_expired'));
		assert.equal(waiting.size, 0);
		assert.equal(aliceRoom.reconnections.length, 0);
		assert.equal(alice.socket.readyState, WebSocket.OPEN);
		await close(intruder);
	}
	const renamed = await connect({ token: 'alice-renamed', resumeToken: alice.token });
	assert.equal(aliceRoom.reconnections.length, 1);
	assert.equal(aliceRoom.entry.displayName, 'Alice');
	const otherTab = await connect({ token: 'alice' });
	assert.notEqual(otherTab.token, renamed.token);
	assert.notEqual(serverSocket(otherTab).playerId, serverSocket(renamed).playerId);
	await close(otherTab);
	await until(() => waiting.size === 0);

	// Une room devenue non reprenable ne relance jamais la recherche seule.
	await close(renamed);
	await until(() => aliceRoom.disconnections.length === 1);
	aliceRoom.acceptResume = false;
	const rejected = await connect({ token: 'alice', resumeToken: renamed.token });
	assert.ok(rejected.messages.some((msg) => msg.code === 'reconnect_expired'));
	assert.equal(waiting.size, 0);
	await close(rejected);

	// Le lobby ne conserve pas indefiniment les sessions deconnectees.
	const queued = await connect();
	await close(queued);
	await new Promise((resolve) => setTimeout(resolve, 120));
	const staleQueue = await connect({ resumeToken: queued.token });
	assert.ok(staleQueue.messages.some((msg) => msg.code === 'reconnect_expired'));
	assert.equal(waiting.size, 0);
	await close(staleQueue);

	// Une fin de partie recue en ligne renouvelle aussi le token sur Rejouer.
	const finished = await connect();
	const finishedRoom = putInRoom(finished);
	finishedRoom.entry.sendFn({ type: 'roomClosed', code: 'game_finished' });
	finished.socket.send(JSON.stringify({ type: 'replay' }));
	await until(() => finished.messages.filter((msg) => msg.type === 'session').length === 2);
	assert.notEqual(finished.messages.filter((msg) => msg.type === 'session')[1].token, finished.token);
	assert.equal(waiting.size, 1);
	await close(finished);
	await until(() => waiting.size === 0);

	// Une coupure silencieuse est detectee par ping/pong et ouvre le meme
	// droit de reprise qu'une fermeture propre, sans supprimer le joueur.
	const silent = await connect({}, { autoPong: false });
	const silentRoom = putInRoom(silent);
	await until(() => silent.socket.readyState === WebSocket.CLOSED && silentRoom.disconnections.length === 1);
	const recovered = await connect({ resumeToken: silent.token });
	assert.equal(silentRoom.reconnections.length, 1);
	assert.ok(recovered.messages.some((msg) => msg.type === 'reconnected'));
	console.log('OK : reprises WebSocket, refresh concurrent, expiration, identite, heartbeat et replay');
}
finally
{
	await Promise.all([...clients].map((client) => close(client)));
	await new Promise((resolve, reject) => wss.close((error) => error ? reject(error) : resolve()));
}
