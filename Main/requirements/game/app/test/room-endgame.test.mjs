// Etape 1, bug B1 : une partie terminee doit fermer sa room.
import { createRoom, roomCount } from '../game/room.js';
import { check, report } from './check.mjs';

const received = [];
const room = createRoom();
room.addPlayer('h1', (msg) => received.push(msg));

// Avant le correctif, endGame laissait la room dans le registre pour toujours,
// et createRoom pouvait y placer un nouveau joueur.
room.endGame();

check('gameEnd diffuse', received.some((m) => m.type === 'gameEnd'));
check('room fermee des la fin de partie', roomCount() === 0);
check('roomClosed suit gameEnd, avec le motif game_finished',
	received.findIndex((m) => m.type === 'gameEnd')
		< received.findIndex((m) => m.type === 'roomClosed' && m.code === 'game_finished'));

report();
