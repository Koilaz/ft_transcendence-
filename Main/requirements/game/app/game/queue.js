import { gameConfig } from './config.js';
import { createRoom } from './room.js';
//usableBots : les bots de gameConfig.bots reellement exploitables
import { usableBots, unavailableBots, recheckDownAgents } from '../agents/index_agent.js';

//File d'attente unique.
const waiting = new Map(); // playerId -> { sendFn, onRoomJoined, displayName }
let timerId = null;
let countdown = null;
let recheckTimer = null;


//Les bots comptent dans minPlayers et maxPlayers
function humansNeeded()
{

	const bots = usableBots().length;
	return {
		min: Math.max(1, gameConfig.minPlayers - bots),
		max: Math.max(1, gameConfig.maxPlayers - bots),
	};
}

//Tous les bots configures sont hors service
function noBotAvailable()
{
	return gameConfig.bots.length > 0 && usableBots().length === 0;
}

//Les conditions du compte a rebours : un imposteur disponible, le seuil humain
//atteint, et un « Prêt » explicite de chaque joueur en file.
function canStart()
{
	if (noBotAvailable())
		return false;
	if (waiting.size < humansNeeded().min)
		return false;
	for (const entry of waiting.values())
	{
		if (!entry.ready)
			return false;
	}
	return true;
}

//On reutilise le message `state` existant plutot que d'en inventer un. Le front
//connait ainsi le seuil humain effectif, qui tient compte des bots disponibles.
function broadcastQueue()
{
	const { min } = humansNeeded();
	let readyPlayers = 0;
	for (const entry of waiting.values())
	{
		if (entry.ready)
			readyPlayers++;
	}
	for (const entry of waiting.values())
	{
		entry.sendFn({
			type: 'state',
			status: 'waiting',
			players: waiting.size,
			min_players: min,
			ready_players: readyPlayers,
			ready: entry.ready,
			room_number: null,
			countdown,
		});
	}
}

function stopCountdown()
{
	if (timerId)
	{
		clearInterval(timerId);
		timerId = null;
	}
	countdown = null;
}

function startCountdown()
{
	if (timerId)
		return;
	countdown = gameConfig.startingTimer;
	broadcastQueue();
	timerId = setInterval(() =>
	{
		countdown--;
		if (countdown <= 0)
			return launch();
		broadcastQueue();
	}, 1000);
}

//Forme un groupe et lance la partie. Les joueurs retenus quittent la file.
function launch()
{
	stopCountdown();
	if (noBotAvailable())
	{
		broadcastQueue();
		return;
	}
	const max = humansNeeded().max;
	const group = [];
	for (const [playerId, entry] of waiting)
	{
		if (group.length === max)
			break;
		group.push([playerId, entry]);
	}
	for (const [playerId] of group)
		waiting.delete(playerId);

	const room = createRoom(usableBots());
	for (const [playerId, entry] of group)
	{
		room.addPlayer(playerId, entry.sendFn, { displayName: entry.displayName });
		entry.onRoomJoined(room);
	}
	room.startNewRound();

	broadcastQueue();   // ceux qui restent voient le compteur retomber
	return room;
}

//Healthcheck apres un agent down
function scheduleRecheck()
{
	if (recheckTimer || !waiting.size || !unavailableBots().length)
		return;
	recheckTimer = setTimeout(async () =>
	{
		const recovered = await recheckDownAgents();
		recheckTimer = null;
		if (recovered.length)
			onAgentsRecovered();
		scheduleRecheck();
	}, gameConfig.agentRecheckDelay * 1000);
	recheckTimer.unref();// une verification en attente ne doit pas retenir le processus
}

//Le front garde la derniere liste agentsDown recue : une liste vide efface
//l'alerte et rend le bouton « Prêt » de nouveau cliquable. Des joueurs deja
//prets ne recliqueront pas : c'est ici que leur compte a rebours repart.
function onAgentsRecovered()
{
	const agents = unavailableBots();
	for (const entry of waiting.values())
		entry.sendFn({ type: 'agentsDown', agents });
	if (canStart())
		startCountdown();
	else
		broadcastQueue();
}

//onRoomJoined(room) previent l'appelant quand le joueur passe en partie :
//server.js s'en sert pour raccrocher la room a la socket.
export function enqueue(playerId, sendFn, onRoomJoined, displayName = null)
{
	if (timerId)
		stopCountdown();
	waiting.set(playerId, { sendFn, onRoomJoined, displayName, ready: false });

	// Atteindre le seuil rend le bouton « Prêt » disponible ; un clic explicite
	// est nécessaire pour lancer la partie, même si la room est pleine.
	broadcastQueue();
	scheduleRecheck();
}

export function dequeue(playerId)
{
	if (!waiting.delete(playerId))
		return;
	let allReady = true;
	for (const entry of waiting.values())
	{
		if (!entry.ready)
		{
			allReady = false;
			break;
		}
	}
	if (waiting.size < humansNeeded().min || !allReady)
		stopCountdown();
	broadcastQueue();
}

export function ready(playerId)
{
	const entry = waiting.get(playerId);
	if (!entry || entry.ready)
		return;
	entry.ready = true;
	if (canStart())
		startCountdown();
	else
		broadcastQueue();
}

export function queueSize()
{
	return waiting.size;
}
