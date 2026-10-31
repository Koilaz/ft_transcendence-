import { randomBytes } from 'node:crypto';
import { gameConfig } from './game/config.js';

function cleanDisplayName(raw)
{
	if (!raw)
		return null;
	return raw.replace(/\p{C}/gu, '').trim().slice(0, 20) || null;
}

// Le token de reprise retrouve le meme joueur ; un compte ne peut avoir
// qu'un joueur en file ou en partie. Les dependances sont injectees pour
// verifier le transport sans serveur HTTP ni appel aux agents.
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
	// token de reprise -> session. Une session n'y reste que tant qu'elle est
	// reprenable : elle en sort sur tout roomClosed, ou apres queuedSessionTtlMs
	// passes sans socket dans le lobby.
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

	// Une session encore enregistree garde son token. Une session invalidee en
	// recoit un neuf : l'ancien token ne doit plus rien reprendre.
	function register(session)
	{
		if (sessions.get(session.token) !== session)
		{
			session.token = randomBytes(32).toString('base64url');
			sessions.set(session.token, session);
		}
		session.sendFn({ type: 'session', token: session.token });
	}

	// Le lobby signale les bots hors service. Le front l'oublie a chaque retour
	// en file (resetGame) : on le redit a la connexion comme au replay.
	function sendAgentsDown(session)
	{
		const brokenAgents = unavailableBots();
		if (brokenAgents.length)
			session.sendFn({ type: 'agentsDown', agents: brokenAgents });
	}

	// Comparer les comptes issus du JWT verifie : deux JWT peuvent designer le
	// meme compte. Une place reservee en room compte encore, mais pas les
	// invites ni la session reprise elle-meme.
	function accountInUse(session)
	{
		return session.userId !== null && [...sessions.values()].some((other) =>
			other !== session && other.userId === session.userId && (other.queued || other.room));
	}

	function enqueueSession(session)
	{
		// Ce point d'entree couvre aussi « Rejouer ».
		if (accountInUse(session))
		{
			session.sendFn({ type: 'roomClosed', code: 'account_in_use' });
			return;
		}
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

	// L'identite est figee a la creation : pseudo du compte, sinon pseudo
	// d'invite. sendFn reste la meme fonction toute la vie de la session : la
	// file et la room la conservent, et elle ecrit sur la socket du moment.
	function createSession(user, guestName)
	{
		const session = {
			playerId: `joueur-${nextPlayerId++}`,
			userId: user?.userId ?? null,
			displayName: user?.username ?? cleanDisplayName(guestName),
			token: null,
			socket: null,
			room: null,
			queued: false,
			expiryTimer: null,
		};
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
		return session;
	}

	function handleMessage(session, data)
	{
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
				sendAgentsDown(session);
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
			const text = msg.text.trim().slice(0, gameConfig.maxMessageLength);
			if (text)
				session.room.addMessage(session.playerId, text);
		}
		else if (msg.type === 'vote' && typeof msg.targetCharacter === 'string')
			session.room.submitVote(session.playerId, msg.targetCharacter);
	}

	function handleClose(session)
	{
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
		// Une session encore valide reste reprenable le temps d'un refresh.
		if (sessions.get(session.token) === session)
		{
			session.expiryTimer = setTimeout(() => invalidate(session), queuedSessionTtlMs);
			session.expiryTimer.unref();
		}
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
		const session = resuming ? previous : createSession(user, params.get('name'));

		cancelExpiry(session);
		const oldSocket = session.socket;
		session.socket = socket;
		socket.playerId = session.playerId;
		socket.isAlive = true;
		socket.on('error', (err) => logger.error(`[ws] ${session.playerId} :`, err.message));
		socket.on('pong', () => { socket.isAlive = true; });

		// Le close et les messages tardifs d'une ancienne socket ne doivent
		// pas affecter le joueur apres un refresh ou une reprise concurrente.
		socket.on('message', (data) => {
			if (session.socket === socket)
				handleMessage(session, data);
		});
		socket.on('close', () => {
			if (session.socket === socket)
				handleClose(session);
		});

		// Transferer la propriete avant de fermer l'ancienne socket : son close
		// ne doit pas signaler une deconnexion de la nouvelle connexion.
		oldSocket?.close(4001, 'Connexion remplacée');
		register(session);
		sendAgentsDown(session);

		// Une session neuve n'a pas de room : ce cas est une reprise en partie.
		if (session.room)
		{
			if (!session.room.reconnectPlayer(session.playerId, session.sendFn))
				session.sendFn({ type: 'roomClosed', code: 'reconnect_expired' });
		}
		else if (resumeToken && !resuming)
		{
			// Une reprise expiree ne cherche pas de partie d'elle-meme : le
			// client repart en file par un 'replay' sur cette meme socket.
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
	heartbeat.unref();
	wss.on('close', () => {
		clearInterval(heartbeat);
		for (const session of sessions.values())
			cancelExpiry(session);
		sessions.clear();
	});
}
