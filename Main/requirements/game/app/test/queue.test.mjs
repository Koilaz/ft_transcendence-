// Etape 7 : file d'attente (A6). Remplace le remplissage sequentiel des rooms.
import { gameConfig } from '../game/config.js';

// Sans bot, une manche lancee donne le premier tour a un humain dont le sendFn
// est un espion : aucun appel au LLM, aucun credit API consomme. queue.js lit
// gameConfig a chaque appel, cette mutation est donc prise en compte.
gameConfig.bots = [];

const { enqueue, dequeue, queueSize } = await import('../game/queue.js');
const { roomCount } = await import('../game/room.js');
const { check, report } = await import('./check.mjs');

const humansMin = gameConfig.minPlayers;
const humansMax = gameConfig.maxPlayers;
console.log(`(sans bot : ${humansMin} humains pour demarrer, ${humansMax} au maximum)\n`);

// Un joueur de test : collecte ses messages et retient la room qu'on lui donne.
function joueur(id)
{
	const p = { id, msgs: [], room: null };
	p.join = () => enqueue(id, (m) => p.msgs.push(m), (room) => { p.room = room; });
	return p;
}

// ------------------------------------ A. en dessous du seuil : on patiente
const premiers = [];
for (let i = 0; i < humansMin - 1; i++)
{
	const p = joueur(`h${i}`);
	p.join();
	premiers.push(p);
}

check('A. les joueurs restent en file', queueSize() === humansMin - 1);
check('A. aucune room creee', roomCount() === 0);
check('A. aucun joueur place en partie', premiers.every((p) => p.room === null));

const dernier = premiers[premiers.length - 1];
check('A. le lobby diffuse un compteur', dernier.msgs.at(-1)?.type === 'state');
check('A. et rien d autre que le compteur',
	dernier.msgs.at(-1)?.players === humansMin - 1 && dernier.msgs.at(-1)?.room_number === null);

// ------------------------------- B. un depart fait retomber le compteur
{
	const partant = joueur('sortant');
	partant.join();
	check('B. la file grandit', queueSize() === humansMin);
	dequeue('sortant');
	check('B. la file retombe', queueSize() === humansMin - 1);
	check('B. toujours aucune room', roomCount() === 0);
}

// --------------------- C. au plafond, la partie se lance immediatement
{
	// Le nombre manquant est calcule AVANT la boucle : launch() vide la file des
	// qu'on atteint le plafond, donc une condition sur queueSize() ne se
	// terminerait jamais et lancerait une partie a chaque tour.
	const nouveaux = [];
	const manquants = humansMax - queueSize();
	for (let i = 0; i < manquants; i++)
	{
		const p = joueur(`n${i}`);
		p.join();
		nouveaux.push(p);
	}

	const tous = [...premiers, ...nouveaux];
	check('C. une room a ete creee', roomCount() === 1);
	check('C. la file est videe', queueSize() === 0);
	check('C. tous les joueurs ont recu leur room', tous.every((p) => p.room !== null));
	check('C. tous dans la MEME room', new Set(tous.map((p) => p.room.id)).size === 1);

	const room = tous[0].room;
	check('C. la room nait avec son effectif definitif', room.players.size === humansMax);
	check('C. la manche est lancee', room.status === 'playing' && room.currentRound !== null);
	check('C. chacun a recu son personnage',
		tous.every((p) => p.msgs.some((m) => m.type === 'assignment')));

	room.destroy('game_finished');   // coupe le chrono de tour
	check('C. registre vide', roomCount() === 0);
}

report();
