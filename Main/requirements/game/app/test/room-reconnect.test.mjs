// Une coupure garde le siege jusqu'a la fin de la manche. Horloge locale pour
// exercer les vrais chronos sans attendre et sans appel a un agent externe.
import { createRoom, roomCount } from '../game/room.js';
import { Round } from '../game/round.js';
import { gameConfig } from '../game/config.js';
import { check, report } from './check.mjs';

const original = {
	setInterval, clearInterval, setTimeout, clearTimeout, now: Date.now,
	turnDuration: gameConfig.turnDuration, turnPerRound: gameConfig.turnPerRound,
	minPlayersToContinue: gameConfig.minPlayersToContinue, maxRounds: gameConfig.maxRounds,
};
let now = 100000;
let nextTimer = 1;
const timers = new Map();
function schedule(callback, delay, repeating)
{
	const id = nextTimer++;
	timers.set(id, { callback, delay, repeating, at: now + delay });
	return id;
}
globalThis.setInterval = (callback, delay) => schedule(callback, delay, true);
globalThis.setTimeout = (callback, delay) => schedule(callback, delay, false);
globalThis.clearInterval = globalThis.clearTimeout = (id) => timers.delete(id);
Date.now = () => now;
gameConfig.turnDuration = 3;
gameConfig.turnPerRound = 1;
gameConfig.minPlayersToContinue = 3;
gameConfig.maxRounds = 3;

function advance(milliseconds)
{
	const target = now + milliseconds;
	let iterations = 0;
	while (true)
	{
		const next = [...timers.entries()].sort((a, b) => a[1].at - b[1].at)[0];
		if (!next || next[1].at > target)
			break;
		if (++iterations > 1000)
			throw new Error('Une transition relance indefiniment ses chronos');
		const [id, timer] = next;
		now = timer.at;
		if (timer.repeating)
			timer.at += timer.delay;
		else
			timers.delete(id);
		timer.callback();
	}
	now = target;
}

function fixture(humans = 2)
{
	const room = createRoom([]);
	const messages = new Map();
	for (let i = 1; i <= humans; i++)
	{
		const id = `private-human-${i}`;
		const received = [];
		messages.set(id, received);
		room.addPlayer(id, (message) => received.push(message), { displayName: `private-name-${i}` });
	}
	const botMessages = [];
	room.addPlayer('private-bot', (message) => botMessages.push(message),
		{ agentName: 'private-agent', promptName: 'private-prompt' });
	room.preheatBots = () => {};
	room.status = 'playing';
	room.roundNumber = 1;
	const round = new Round([...room.players.values()],
		(message) => room.broadcast(message), (message) => room.addSystemMessage(message),
		(results) => room.handleRoundEnd(results));
	room.currentRound = round;
	room.rounds.push(round);
	round.turnOrder = [...room.players.keys()];
	round.start();
	return { room, round, messages, botMessages };
}

function privateKeys(value)
{
	if (!value || typeof value !== 'object')
		return false;
	return Object.entries(value).some(([key, nested]) =>
		['playerId', 'isAI', 'agentName', 'promptName', 'displayName', 'assignments', 'votes', 'isCorrect'].includes(key)
		|| privateKeys(nested));
}

try
{
	// A. Le retour reprend exactement le tour, le personnage, le vote et le chat.
	{
		const { room, round, messages } = fixture();
		const id = 'private-human-2';
		const player = room.players.get(id);
		player.score = 123;
		room.addMessage('private-human-1', 'Bonjour a tous');
		room.addSystemMessage('Une ligne systeme');
		room.submitVote(id, round.caracterOf('private-bot'));
		const vote = round.votes.get(id);
		const character = round.caracterOf(id);
		advance(1000);
		const timer = round.turnTimerId;
		const turnIndex = round.turnIndex;
		room.disconnectPlayer(id);
		check('A. le siege et son identite persistent', room.players.get(id) === player && player.connected === false);
		check('A. le tour garde son chrono et sa duree restante',
			round.turnTimerId === timer && round.countdown === 2 && round.turnIndex === turnIndex);
		check('A. une coupure ne marque pas un depart definitif', !round.leftPlayers.has(id));
		check('A. les autres voient une absence temporaire sans identite privee',
			messages.get('private-human-1').some((message) => message.type === 'playerDisconnected'
				&& message.character === character && message.temporary === true && !JSON.stringify(message).includes(id)));
		const historySize = room.history.length;
		room.addMessage(id, 'Message provenant de la connexion fermee');
		check('A. une connexion absente ne peut pas parler', room.history.length === historySize);
		advance(1000);
		const received = [];
		check('A. le retour est accepte avant la fin de manche', room.reconnectPlayer(id, (message) => received.push(message)) === true);
		const snapshot = received.find((message) => message.type === 'reconnected');
		check('A. le meme joueur retrouve personnage et score',
			room.players.get(id) === player && player.connected === true && player.score === 123 && snapshot?.character === character);
		check('A. le retour n ajoute ni tour ni temps',
			round.turnTimerId === timer && round.turnIndex === turnIndex && round.countdown === 1
			&& snapshot?.turn?.character === character && snapshot.turn.countdown === 1);
		check('A. le snapshot restaure le vote et la phase courante',
			snapshot?.hasVoted === true && snapshot.roundPhase === 'chatting' && round.votes.get(id) === vote);
		check('A. le chat est restaure une seule fois avec ses seuls champs publics',
			JSON.stringify(snapshot?.history) === JSON.stringify(room.history.map(({ sender, text }) => ({ sender, text })))
			&& received.filter((message) => message.type === 'reconnected').length === 1
			&& !received.some((message) => ['chat', 'assignment', 'yourTurn'].includes(message.type)));
		check('A. aucune identite, nature de bot ou detail de vote ne fuit dans le snapshot',
			!!snapshot && !privateKeys(snapshot) && !JSON.stringify(snapshot).includes('private-'));
		check('A. les autres voient le personnage revenir',
			messages.get('private-human-1').some((message) => message.type === 'playerReconnected' && message.character === character));
		room.submitVote(id, round.caracterOf('private-human-1'));
		check('A. le vote initial ne peut pas etre remplace apres retour', round.votes.get(id) === vote);
		room.addMessage(id, 'Je suis revenu');
		check('A. le joueur revenu reprend effectivement la partie',
			room.history.at(-1)?.text === 'Je suis revenu' && round.currentPlayer.id === 'private-bot');
		room.destroy();
	}

	// B. Plusieurs coupures restent independantes, y compris un retour repete.
	{
		const { room, round } = fixture(3);
		room.disconnectPlayer('private-human-1');
		room.disconnectPlayer('private-human-2');
		room.submitVote('private-human-2', round.caracterOf('private-bot'));
		check('B. un absent ne peut pas enregistrer un nouveau vote', !round.votes.has('private-human-2'));
		advance(gameConfig.turnDuration * 1000);
		const first = [];
		room.reconnectPlayer('private-human-1', (message) => first.push(message));
		check('B. un tour expire pendant la coupure n est pas rejoue au retour',
			round.currentPlayer.id === 'private-human-2' && round.countdown === gameConfig.turnDuration
			&& first.find((message) => message.type === 'reconnected')?.turn?.character === round.caracterOf('private-human-2'));
		const historySize = room.history.length;
		room.addMessage('private-human-1', 'Mon ancien tour');
		check('B. le revenant doit attendre son prochain tour pour parler', room.history.length === historySize);
		check('B. le retour conserve l absence des autres personnages',
			JSON.stringify(first.find((message) => message.type === 'reconnected')?.disconnectedCharacters)
			=== JSON.stringify([round.caracterOf('private-human-2')]));
		const replacement = [];
		room.reconnectPlayer('private-human-1', (message) => replacement.push(message));
		const firstCount = first.length;
		room.broadcast({ type: 'probe' });
		check('B. un retour repete remplace la connexion sans doubler le joueur',
			room.players.size === 4 && first.length === firstCount && replacement.at(-1)?.type === 'probe');
		check('B. un inconnu ou un bot ne peut pas recuperer un siege',
			room.reconnectPlayer('intrus', () => {}) === false && room.reconnectPlayer('private-bot', () => {}) === false);
		room.destroy();
	}

	// C. Meme vide de connexions, la manche continue jusqu a sa vraie echeance.
	{
		const { room, round, messages, botMessages } = fixture();
		room.disconnectPlayer('private-human-1');
		room.disconnectPlayer('private-human-2');
		advance(1000 * gameConfig.turnDuration * round.players.length - 1);
		check('C. tous hors ligne : les places restent disponibles jusqu a la derniere seconde',
			!room.destroyed && room.players.has('private-human-1') && room.players.has('private-human-2'));
		advance(1);
		check('C. a la fin de manche les deux reserves expirent',
			!room.players.has('private-human-1') && !room.players.has('private-human-2')
			&& [...messages.values()].every((received) => received.filter((message) =>
				message.type === 'roomClosed' && message.code === 'reconnect_expired').length === 1));
		check('C. aucun humain restant ferme la room et tous ses chronos',
			room.destroyed && roomCount() === 0 && timers.size === 0
			&& botMessages.some((message) => message.type === 'roomClosed' && message.code === 'empty_room'));
		check('C. un retour apres echeance est refuse', room.reconnectPlayer('private-human-1', () => {}) === false);
	}

	// D. Le quorum est applique seulement apres l expiration des reservations.
	{
		const { room, round, messages } = fixture();
		room.disconnectPlayer('private-human-1');
		check('D. une coupure sous le quorum ne ferme pas la manche courante', !room.destroyed);
		round.endRound();
		check('D. le quorum ferme la partie si le joueur ne revient pas', room.destroyed
			&& messages.get('private-human-2').some((message) => message.type === 'roomClosed' && message.code === 'not_enough_players'));
		check('D. aucun chrono de resolution ne fuit apres cette fermeture', timers.size === 0);
	}
	{
		const { room, round } = fixture(3);
		room.disconnectPlayer('private-human-1');
		round.endRound();
		check('D. avec assez de joueurs, seule la place absente est liberee',
			!room.destroyed && room.players.size === 3 && !room.players.has('private-human-1'));
		advance(4000 + gameConfig.roundTransitionDelay * 1000);
		check('D. la manche suivante commence sans le joueur expire',
			room.roundNumber === 2 && room.currentRound.status === 'chatting'
			&& !room.currentRound.playerById.has('private-human-1'));
		room.destroy();
	}

	// E. Une coupure entre manches laisse le temps de revenir avant le depart.
	{
		const { room, round } = fixture(3);
		round.endRound();
		room.disconnectPlayer('private-human-1');
		const received = [];
		room.reconnectPlayer('private-human-1', (message) => received.push(message));
		const snapshot = received.find((message) => message.type === 'reconnected');
		check('E. retour pendant la resolution : aucun tour de chat relance',
			snapshot?.roundPhase === 'resolution' && snapshot.turn === null && round.turnTimerId === null);
		advance(4000);
		room.disconnectPlayer('private-human-1');
		check('E. la transition conserve temporairement la place',
			room.status === 'transition' && room.players.has('private-human-1'));
		advance(gameConfig.roundTransitionDelay * 1000);
		check('E. le depart suivant libere une place toujours absente',
			room.roundNumber === 2 && !room.players.has('private-human-1')
			&& received.some((message) => message.type === 'roomClosed' && message.code === 'reconnect_expired'));
		room.destroy();
	}

	// F. Une fermeture pendant la resolution annule aussi la suite differee.
	{
		const { room, round } = fixture();
		round.endRound();
		room.destroy();
		check('F. destroy arrete aussi le delai de resolution', timers.size === 0);
		advance(4000 + gameConfig.roundTransitionDelay * 1000);
		room.startNewRound();
		room.onTransitionElapsed();
		check('F. aucun callback ou demarrage tardif ne ressuscite la room',
			room.roundNumber === 1 && room.currentRound === round && round.status === 'stopped' && timers.size === 0);
		check('F. une room detruite ne reprend pas un joueur', room.reconnectPlayer('private-human-1', () => {}) === false);
	}
}
finally
{
	globalThis.setInterval = original.setInterval;
	globalThis.clearInterval = original.clearInterval;
	globalThis.setTimeout = original.setTimeout;
	globalThis.clearTimeout = original.clearTimeout;
	Date.now = original.now;
	for (const key of ['turnDuration', 'turnPerRound', 'minPlayersToContinue', 'maxRounds'])
		gameConfig[key] = original[key];
}

check('toutes les rooms du test ont ete retirees du registre', roomCount() === 0);
report();
