import { gameConfig } from './config.js';
import { createRoom } from './room.js';
//usableBots : les bots de gameConfig.bots reellement exploitables — agent
//present au registre et repondant au healthCheck, prompt present au registre.
//Recalcule a chaque appel, comme le reste : la config bouge et le rapport de
//sante n'existe qu'apres le boot.
import { usableBots, unavailableBots, recheckDownAgents } from '../agents/index_agent.js';

//File d'attente unique. Les joueurs y patientent jusqu'a ce qu'un groupe
//complet puisse etre forme, puis la room nait avec son effectif definitif.
//
//Le lobby ne diffuse qu'un compteur : aucune information sur les autres
//joueurs, aucune communication possible avant le debut de la partie.
const waiting = new Map(); // playerId -> { sendFn, onRoomJoined, displayName }
let timerId = null;
let countdown = null;
let recheckTimer = null;

//Calcule a l'appel et non au chargement du module : gameConfig est ajuste
//souvent, et les tests le modifient.
//Les bots comptent dans minPlayers et maxPlayers
//il faut donc les soustraire pour obtenir le nombre d'humains attendus.
function humansNeeded()
{
	//On compte les bots utilisables, pas ceux configures : si deux des trois
	//sont hors service, il faut un humain de plus pour atteindre le seuil.
	const bots = usableBots().length;
	return {
		min: Math.max(1, gameConfig.minPlayers - bots),
		max: Math.max(1, gameConfig.maxPlayers - bots),
	};
}

//Tous les bots configures sont hors service : il n'y aurait personne a
//demasquer, la partie perdrait son mecanisme central. On garde les joueurs
//en file plutot que de lancer une partie vide de son sens ; le front les a
//deja prevenus par le message agentsDown.
//Le rapport de sante peut tomber en cours de route : une room dont le bot ne
//repond plus relance le healthcheck (voir Room.cancelRound).
function noBotAvailable()
{
	return gameConfig.bots.length > 0 && usableBots().length === 0;
}

//Les conditions du compte a rebours : un imposteur disponible, le seuil humain
//atteint, et un « Prêt » explicite de chaque joueur en file.
function canStart()
{
	return !noBotAvailable() && waiting.size >= humansNeeded().min
		&& [...waiting.values()].every((entry) => entry.ready);
}

//On reutilise le message `state` existant plutot que d'en inventer un. Le front
//connait ainsi le seuil humain effectif, qui tient compte des bots disponibles.
function broadcastQueue()
{
	const { min } = humansNeeded();
	const readyPlayers = [...waiting.values()].filter((entry) => entry.ready).length;
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
		return broadcastQueue();// le rapport est tombe pendant le compte a rebours
	//Les premiers arrives, dans la limite du plafond. L'ordre d'insertion d'une
	//Map est garanti par la specification : c'est ce qui rend ce point
	//remplacable par une selection anti-affinite sans rien changer autour.
	const group = [...waiting.entries()].slice(0, humansNeeded().max);
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

//Un agent tombe puis revient (conteneur ollama relance, quota retrouve) : sans
//nouveau healthcheck, la file le croirait mort jusqu'au redemarrage de game.
//On ne reverifie que tant que quelqu'un attend et qu'un bot manque : personne
//d'autre n'a besoin de la reponse.
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
	if (waiting.size < humansNeeded().min || ![...waiting.values()].every((entry) => entry.ready))
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
