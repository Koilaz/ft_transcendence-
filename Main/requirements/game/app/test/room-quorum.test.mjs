// Etape 4 : quorum de continuation (A4) et bug B2.
import { findOrCreateRoom, roomCount } from '../game/room.js';
import { gameConfig } from '../game/config.js';
import { check, report } from './check.mjs';

console.log(`(minPlayers=${gameConfig.minPlayers}, `
	+ `minPlayersToContinue=${gameConfig.minPlayersToContinue}, `
	+ `bots=${gameConfig.bots.length})\n`);

// Monte une room jusqu'au seuil de demarrage, sans atteindre maxPlayers.
function freshRoom()
{
	const msgs = [];
	const room = findOrCreateRoom();
	while (room.players.size < gameConfig.minPlayers)
		room.addPlayer(`h${room.players.size}`, (m) => msgs.push(m));
	return { room, msgs, last: `h${room.players.size - 1}` };
}

// ------------------------------------------- A. avant le lancement : on attend
{
	const { room, last } = freshRoom();
	check('A. effectif au seuil, compte a rebours lance', room.timerId !== null);

	room.removePlayer(last);
	check('A. compte a rebours annule', room.timerId === null);
	check('A. la room reste en attente', room.status === 'waiting');
	check('A. la room N EST PAS detruite', roomCount() === 1 && room.destroyed === false);
	room.destroy('game_finished');
}

// ------------------------------------ B. partie en cours : sous le seuil = fin
{
	const { room, msgs, last } = freshRoom();
	room.setStatus('playing');
	msgs.length = 0;

	room.removePlayer(last);
	check('B. la partie est annulee', room.destroyed === true);
	check('B. motif transmis au front',
		msgs.find((m) => m.type === 'roomClosed')?.code === 'not_enough_players');
	check('B. room retiree du registre', roomCount() === 0);
}

// -------- C. B2 : un depart pendant le scoreboard ne doit pas renvoyer la
//               room en attente. timerId sert aux deux comptes a rebours.
{
	const { room, last } = freshRoom();
	room.setStatus('scoreboard');
	room.launchStartTimer(gameConfig.scoreboardDuration);
	check('C. scoreboard en cours avec son timer',
		room.status === 'scoreboard' && room.timerId !== null);

	room.removePlayer(last);
	check('C. la room ne retombe PAS en attente (B2)', room.status !== 'waiting');
	check('C. la partie est annulee', room.destroyed === true);
	check('C. registre vide', roomCount() === 0);
}

// ------------- D. partie terminee : la fermeture programmee garde son motif,
//                  sinon le dernier depart couperait la lecture du classement
{
	const { room, msgs, last } = freshRoom();
	room.setStatus('endGame');
	room.closeTimeoutId = setTimeout(() => room.destroy('game_finished'), 60000);
	msgs.length = 0;

	room.removePlayer(last);
	check('D. la room survit pendant la lecture du classement', room.destroyed === false);
	check('D. aucun motif not_enough_players emis', !msgs.some((m) => m.type === 'roomClosed'));

	room.destroy('game_finished');
	check('D. fermeture finale avec le bon motif', roomCount() === 0);
}

report();
