// Etape 4 : quorum de continuation (A4) et bug B2.
// Depuis l'etape 7 une room nait avec son effectif definitif et demarre
// aussitot : elle n'est jamais en attente. Seuls les statuts d'une partie
// lancee sont donc testes ici.
import { createRoom, roomCount } from '../game/room.js';
import { gameConfig } from '../game/config.js';
import { check, report } from './check.mjs';

console.log(`(minPlayersToContinue=${gameConfig.minPlayersToContinue}, `
	+ `bots=${gameConfig.bots.length})\n`);

// Monte une room au seuil de continuation dans le statut voulu, sans lancer de
// vraie manche : on veut eviter tout appel au LLM.
function roomAuSeuil(status)
{
	const msgs = [];
	const room = createRoom();
	while (room.players.size < gameConfig.minPlayersToContinue)
		room.addPlayer(`h${room.players.size}`, (m) => msgs.push(m));
	room.setStatus(status);
	msgs.length = 0;
	return { room, msgs, last: `h${room.players.size - 1}` };
}

// ------------------------------------ A. partie en cours : sous le seuil = fin
{
	const { room, msgs, last } = roomAuSeuil('playing');
	room.removePlayer(last);
	check('A. la partie est annulee', room.destroyed === true);
	check('A. motif transmis au front',
		msgs.find((m) => m.type === 'roomClosed')?.code === 'not_enough_players');
	check('A. room retiree du registre', roomCount() === 0);
}

// -------- B. B2 : un depart entre deux manches ne doit pas renvoyer la
//               room en attente. timerId sert aux deux comptes a rebours.
//               'transition' est le statut que pose handleRoundEnd.
{
	const { room, last } = roomAuSeuil('transition');
	room.launchStartTimer(gameConfig.scoreboardDuration);
	check('B. transition en cours avec son timer',
		room.status === 'transition' && room.timerId !== null);

	room.removePlayer(last);
	check('B. la room ne retombe PAS en attente (B2)', room.status !== 'waiting');
	check('B. la partie est annulee', room.destroyed === true);
	check('B. registre vide', roomCount() === 0);
}

report();
