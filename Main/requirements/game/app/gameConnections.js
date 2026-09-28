import { randomBytes } from 'node:crypto';

const MAX_CHAT_LENGTH = 500;

function cleanDisplayName(raw)
{
	if (!raw)
		return null;
	return raw.replace(/\p{C}/gu, '').trim().slice(0, 20) || null;
}

// Une session appartient a son token de reprise, pas au pseudo ni au compte :
// un meme compte peut donc ouvrir plusieurs joueurs. Les dependances sont injectees
// pour verifier le transport sans serveur HTTP ni appel aux agents.
export function attachGameConnections(wss, {
	enqueue,
	dequeue,
	ready,
	verifyToken,
	unavailableBots = () => [],
	queuedSessionTtlMs = 60000,
	heartbeatMs = 30000,
	logger = console,
})
{
	const sessions = new Map();
	let nextPlayerId = 1;

	function cancelExpiry(session)
	{
		clearTimeout(session.expiryTimer);
		session.expiryTimer = null;
	}

	function invalidate(session)
	{
		cancelExpiry(session);
		sessions.delete(session.token);
	}

	function register(session)
	{
		if (sessions.get(session.token) !== session)
		{
			session.token = randomBytes(32).toString('base64url');
			sessions.set(session.token, session);
		}
		session.sendFn({ type: 'session', token: session.token });
	}

	function enqueueSession(session)
	{
		// Une reprise dans le lobby demande de confirmer a nouveau « Pret ».
		if (session.queued)
			dequeue(session.playerId);
		session.queued = true;
		enqueue(session.playerId, session.sendFn, (room) => {
			session.queued = false;
			session.room = room;
			logger.log(`${session.playerId} → room ${room.id}`);
		}, session.displayName);
	}

	wss.on('connection', (socket, request) => {
		const params = new URL(request.url, 'http://placeholder').searchParams;
		const user = verifyToken(params.get('token'));
		const userId = user?.userId ?? null;
		const resumeToken = params.get('resumeToken');
		const previous = resumeToken ? sessions.get(resumeToken) : null;
		// Le token de reprise ne permet pas de changer de compte, ni de
		// reprendre un compte avec un JWT expire devenu invite.
		const resuming = !!previous && previous.userId === userId;
		const session = resuming ? previous : {
			playerId: `joueur-${nextPlayerId++}`,
			userId,
			displayName: user?.username ?? cleanDisplayName(params.get('name')),
			token: null,
			socket: null,
			room: null,
			queued: false,
			expiryTimer: null,
		};

		if (!resuming)
		{
			session.sendFn = (msg) => {
				// Le Player conserve ce callback hors ligne : la fin de manche
				// ou de room doit aussi invalider les sessions absentes.
				if (msg.type === 'roomClosed')
				{
					session.room = null;
					session.queued = false;
					invalidate(session);
				}
				const current = session.socket;
				if (current && current.readyState === current.OPEN)
					current.send(JSON.stringify(msg));
			};
		}

		cancelExpiry(session);
		const oldSocket = session.socket;
		session.socket = socket;
		socket.userId = session.userId;
		socket.playerId = session.playerId;
		socket.isAlive = true;
		socket.on('error', (err) => logger.error(`[ws] ${session.playerId} :`, err.message));
		socket.on('pong', () => { socket.isAlive = true; });

		socket.on('message', (data) => {
			// Le close et les messages tardifs d'une ancienne socket ne doivent
			// pas affecter le joueur apres un refresh ou une reprise concurrente.
			if (session.socket !== socket)
				return;
			let msg;
			try
			{
				msg = JSON.parse(data.toString());
			}
			catch (error)
			{
				logger.error('message non-JSON ignoré:', error.message);
				return;
			}
			if (!msg || typeof msg !== 'object')
				return;

			if (msg.type === 'replay')
			{
				if (!session.room)
				{
					register(session);
					if (!session.queued)
						enqueueSession(session);
				}
				return;
			}
			if (!session.room)
			{
				if (msg.type === 'ready' && session.queued)
					ready(session.playerId);
				return;
			}
			if (msg.type === 'chat')
			{
				if (typeof msg.text !== 'string')
					return;
				const text = msg.text.trim().slice(0, MAX_CHAT_LENGTH);
				if (text)
					session.room.addMessage(session.playerId, text);
			}
			else if (msg.type === 'vote' && typeof msg.targetCharacter === 'string')
				session.room.submitVote(session.playerId, msg.targetCharacter);
		});

		socket.on('close', () => {
			if (session.socket !== socket)
				return;
			session.socket = null;
			if (session.room)
			{
				// La room garde la place jusqu'a la fin de la manche et notifie
				// sendFn si le delai est depasse, meme sans socket ouverte.
				session.room.disconnectPlayer(session.playerId);
				return;
			}
			if (session.queued)
			{
				dequeue(session.playerId);
				session.queued = false;
			}
			if (sessions.get(session.token) === session)
			{
				session.expiryTimer = setTimeout(() => invalidate(session), queuedSessionTtlMs);
				session.expiryTimer.unref?.();
			}
		});

		// Transferer la propriete avant de fermer l'ancienne socket : son close
		// ne doit pas signaler une deconnexion de la nouvelle connexion.
		if (oldSocket && oldSocket !== socket)
			oldSocket.close(4001, 'Connexion remplacée');
		register(session);
		const brokenAgents = unavailableBots();
		if (brokenAgents.length)
			session.sendFn({ type: 'agentsDown', agents: brokenAgents });

		if (resuming && session.room)
		{
			if (!session.room.reconnectPlayer(session.playerId, session.sendFn))
				session.sendFn({ type: 'roomClosed', code: 'reconnect_expired' });
		}
		else if (params.has('resumeToken') && !resuming)
		{
			// Une reprise expiree attend le clic Rejouer pour chercher une partie.
			session.sendFn({ type: 'roomClosed', code: 'reconnect_expired' });
		}
		else
			enqueueSession(session);
	});

	const heartbeat = setInterval(() => {
		for (const client of wss.clients)
		{
			if (!client.isAlive)
			{
				client.terminate();
				continue;
			}
			client.isAlive = false;
			client.ping();
		}
	}, heartbeatMs);
	heartbeat.unref?.();
	wss.on('close', () => {
		clearInterval(heartbeat);
		for (const session of sessions.values())
			cancelExpiry(session);
		sessions.clear();
	});
}
