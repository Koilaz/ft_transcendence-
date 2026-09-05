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
check('fermeture programmee (closeTimeoutId arme)', room.closeTimeoutId !== null);
check('room encore vivante pendant la lecture du classement', roomCount() === 1);

// On force la fermeture sans attendre roomCloseDelayMs
room.destroy('game_finished');
check('fermeture effective apres destroy', roomCount() === 0);
check('timeout de fermeture annule', room.closeTimeoutId === null);

report();
