// Une partie sans agent exploitable n'a plus de mecanisme central : il n'y a
// personne a demasquer. La file doit donc refuser de la lancer.
import { gameConfig } from '../game/config.js';

// Le nom exact du bug rencontre en conditions reelles : une coquille dans
// config.js (ministral_big au lieu de ministral_14b ou mistral_big). L'agent
// est absent du registre, unavailableBots le detecte sans aucun appel reseau.
gameConfig.bots = ['ministral_big'];
gameConfig.startingTimer = 1;

const { enqueue, dequeue, queueSize, ready } = await import('../game/queue.js');
const { roomCount } = await import('../game/room.js');
const { unavailableBots } = await import('../agents/index_agent.js');
const { check, report } = await import('./check.mjs');

check('le bot configure est bien detecte comme indisponible',
	unavailableBots().some((b) => b.name === 'ministral_big' && b.reason === 'unknown_agent'));

// On depasse largement le plafond : avant le correctif, la partie demarrait.
const joueurs = [];
for (let i = 0; i < gameConfig.maxPlayers + 2; i++)
{
	const p = { msgs: [], room: null };
	enqueue(`h${i}`, (m) => p.msgs.push(m), (r) => { p.room = r; });
	joueurs.push(p);
}

check('AUCUNE partie n est lancee', roomCount() === 0);
check('aucun joueur n est place en room', joueurs.every((p) => p.room === null));
check('les joueurs restent tous en file', queueSize() === joueurs.length);
check('le lobby continue de diffuser son compteur',
	joueurs[0].msgs.at(-1)?.type === 'state');

// La file reste vivante : on peut en sortir normalement.
dequeue('h0');
check('la file reste utilisable', queueSize() === joueurs.length - 1);

// Avec un agent valide, la file reste en attente jusqu'a l'action « Prêt ».
gameConfig.bots = ['mistral_medium'];
const valide = { msgs: [], room: null };
enqueue('valide', (m) => valide.msgs.push(m), (r) => { valide.room = r; });
check('un agent valide ne lance pas seul la partie', roomCount() === 0);
for (const id of joueurs.map((_, index) => `h${index + 1}`))
	ready(id);
ready('valide');
check('tous prets ne lancent pas immediatement', roomCount() === 0);
await new Promise((resolve) => setTimeout(resolve, 1200));
check('une fois le compte a rebours termine, la partie demarre', roomCount() === 1);

// launch() sert les PREMIERS arrives : le dernier inscrit n'est pas forcement
// du voyage, on cherche donc celui qui a effectivement recu une room.
const place = joueurs.find((p) => p.room !== null);
check('des joueurs ont bien ete places', place !== undefined);
check('le bot est present dans la room',
	place.room.humanCount < place.room.players.size);

place.room.destroy('game_finished');
check('registre vide', roomCount() === 0);

report();
