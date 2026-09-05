import { gameConfig } from './config.js';
import { createRoom } from './room.js';
import { unavailableBots } from '../agents/index.js';

//Les bots de gameConfig.bots reellement exploitables : ni absents du registre,
//ni recales par le healthCheck du demarrage. Recalcule a chaque appel, comme
//le reste : la config bouge et le rapport de sante n'existe qu'apres le boot.
function usableBots()
{
	const hs = new Set(unavailableBots().map((b) => b.name));
	return gameConfig.bots.filter((name) => !hs.has(name));
}

//File d'attente unique. Les joueurs y patientent jusqu'a ce qu'un groupe
//complet puisse etre forme, puis la room nait avec son effectif definitif.
//
//Le lobby ne diffuse qu'un compteur : aucune information sur les autres
//joueurs, aucune communication possible avant le debut de la partie.
const waiting = new Map(); // playerId -> { sendFn, onRoomJoined, displayName }
let timerId = null;
let countdown = null;

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

//On reutilise le message `state` existant plutot que d'en inventer un : le
//front sait deja afficher ce lobby, aucune modification cote client n'est
//necessaire. room_number vaut null tant qu'aucune room n'existe, ce que le
//front rend deja par « Salle #— ». Un message `queue` dedie viendra avec
//l'etape 8.
function broadcastQueue()
{
	for (const entry of waiting.values())
	{
		entry.sendFn({
			type: 'state',
			status: 'waiting',
			players: waiting.size,
			room_number: null,
			countdown,
		});
	}
}

function startCountdown()
{
	if (timerId)
		return;
	countdown = gameConfig.startingTimer;
	timerId = setInterval(() =>
	{
		countdown--;
		if (countdown <= 0)
			return launch();
		broadcastQueue();
	}, 1000);
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

//Forme un groupe et lance la partie. Les joueurs retenus quittent la file.
function launch()
{
	stopCountdown();

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

//onRoomJoined(room) previent l'appelant quand le joueur passe en partie :
//server.js s'en sert pour raccrocher la room a la socket.
export function enqueue(playerId, sendFn, onRoomJoined, displayName = null)
{
	waiting.set(playerId, { sendFn, onRoomJoined, displayName });

	//Tous les bots configures sont hors service : il n'y aurait personne a
	//demasquer, la partie perdrait son mecanisme central. On garde les joueurs
	//en file plutot que de lancer une partie vide de son sens ; le front les a
	//deja prevenus par le message agentsDown recu a la connexion.
	if (gameConfig.bots.length > 0 && usableBots().length === 0)
	{
		broadcastQueue();
		return;
	}

	const { min, max } = humansNeeded();
	if (waiting.size >= max)
		return launch();
	if (waiting.size >= min)
		startCountdown();
	broadcastQueue();
}

export function dequeue(playerId)
{
	if (!waiting.delete(playerId))
		return;
	if (waiting.size < humansNeeded().min)
		stopCountdown();
	broadcastQueue();
}

export function queueSize()
{
	return waiting.size;
}
