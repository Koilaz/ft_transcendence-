// Etape 6 : etat « fermee », distinct de « pleine » (O3).
import { findOrCreateRoom, roomCount } from '../game/room.js';
import { check, report } from './check.mjs';

// ------------------------------- A. une room en attente accueille du monde
{
	const room = findOrCreateRoom();
	check('A. une room neuve est ouverte', room.isOpen() === true);

	room.addPlayer('h1', () => {});
	check('A. findOrCreateRoom renvoie la meme room', findOrCreateRoom() === room);
	check('A. aucune room superflue creee', roomCount() === 1);
	room.destroy('game_finished');
}

// ---- B. le cas vise : une partie lancee avec une place libre reste fermee
{
	const room = findOrCreateRoom();
	room.addPlayer('h1', () => {});
	room.setStatus('playing');

	check('B. il reste de la place', room.isFull() === false);
	check('B. mais la room est fermee', room.isOpen() === false);

	const autre = findOrCreateRoom();
	check('B. un arrivant n est PAS parachute dans la partie', autre !== room);
	check('B. une nouvelle room est creee', roomCount() === 2);

	autre.destroy('game_finished');
	room.destroy('game_finished');
}

// -------------------- C. une room pleine mais en attente est fermee aussi
{
	const room = findOrCreateRoom();
	room.addPlayer('h1', () => {});

	// On abaisse le plafond au lieu de remplir la room jusqu'a maxPlayers :
	// atteindre le plafond via addPlayer declenche startNewRound, donc un vrai
	// tour, donc un appel au LLM si le tirage met le bot en premier. Un test ne
	// doit ni consommer de credits API ni dependre d'un alea.
	room.maxPlayers = room.players.size;

	check('C. room pleine', room.isFull() === true);
	check('C. toujours en attente', room.status === 'waiting');
	check('C. mais fermee', room.isOpen() === false);
	check('C. aucune manche lancee', room.currentRound === null);

	room.destroy('game_finished');
	check('C. registre vide', roomCount() === 0);
}

report();
