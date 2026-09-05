// Etape 1 : Room.destroy(), le registre et ses accesseurs.
import { findOrCreateRoom, deleteRoom, roomCount } from '../game/room.js';
import { gameConfig } from '../game/config.js';
import { check, report } from './check.mjs';

// Remplit jusqu'a minPlayers pour declencher le compte a rebours de demarrage,
// sans atteindre maxPlayers (qui lancerait une manche, donc un appel au LLM).
// L'effectif est deduit de gameConfig : ce reglage bouge souvent, le test ne
// doit pas le supposer.
const received = [];
const room = findOrCreateRoom();
while (room.players.size < gameConfig.minPlayers)
	room.addPlayer(`h${room.players.size}`, (msg) => received.push(msg));

check('room enregistree dans le registre', roomCount() === 1);
check('effectif au seuil de demarrage', room.players.size === gameConfig.minPlayers);
check('numberOfPlayer suit players.size', room.numberOfPlayer === room.players.size);
check('timer de demarrage lance', room.timerId !== null);

received.length = 0;
room.destroy('not_enough_players');

const closed = received.find((m) => m.type === 'roomClosed');
check('roomClosed diffuse aux joueurs', !!closed);
check('code machine neutre transmis', closed?.code === 'not_enough_players');
check('timer de room coupe', room.timerId === null);
check('room retiree du registre', roomCount() === 0);
check('marquee comme detruite', room.destroyed === true);

received.length = 0;
room.destroy('game_finished');
check('second destroy sans effet', received.length === 0);

// O2 : le registre est prive au module, deleteRoom est sa seule porte d'entree
const room2 = findOrCreateRoom();
check('deleteRoom ferme une room existante', deleteRoom(room2.id) === true);
check('deleteRoom sur id inconnu renvoie false', deleteRoom(99999) === false);
check('registre vide', roomCount() === 0);

report();
