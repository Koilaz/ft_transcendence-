// Etape 5 : destruction des rooms orphelines (O5).
// Le piege : players.size ne tombe jamais a zero, le bot n'ayant pas de socket
// n'est jamais retire. C'est le nombre d'humains qui compte.
import { findOrCreateRoom, roomCount } from '../game/room.js';
import { check, report } from './check.mjs';

// ------------------------------------------------ A. le bot ne compte pas
{
	const room = findOrCreateRoom();
	check('A. la room neuve contient deja son ou ses bots', room.players.size > 0);
	check('A. mais aucun humain', room.humanCount === 0);

	room.addPlayer('h1', () => {});
	check('A. humanCount ignore les bots', room.humanCount === 1);
	room.destroy('game_finished');
}

// --------------- B. le cas que rien d'autre ne couvrait : attente desertee
{
	const msgs = [];
	const room = findOrCreateRoom();
	room.addPlayer('h1', (m) => msgs.push(m));
	check('B. room en attente avec un seul humain', room.status === 'waiting' && room.humanCount === 1);

	// Le partant est retire de players AVANT la diffusion, il ne peut donc pas
	// recevoir roomClosed. On observe depuis le bot, seul membre restant.
	const bot = [...room.players.values()].find((p) => p.agentName);
	const botMsgs = [];
	bot.sendFn = (m) => botMsgs.push(m);

	msgs.length = 0;
	room.removePlayer('h1');
	check('B. la room est detruite', room.destroyed === true);
	check('B. motif empty_room', botMsgs.find((m) => m.type === 'roomClosed')?.code === 'empty_room');
	check('B. le partant ne recoit rien', msgs.length === 0);
	check('B. registre vide, plus de fuite', roomCount() === 0);
	check('B. players.size n etait pourtant PAS a zero', room.players.size > 0);
}

// ------------------- C. il reste un humain : la room survit et attend
{
	const room = findOrCreateRoom();
	room.addPlayer('h1', () => {});
	room.addPlayer('h2', () => {});
	room.removePlayer('h2');
	check('C. la room survit tant qu il reste un humain', room.destroyed === false);
	check('C. humanCount a jour', room.humanCount === 1);
	check('C. toujours en attente', room.status === 'waiting');
	room.destroy('game_finished');
}

// --------- D. partie en cours desertee : empty_room prime sur le quorum
{
	const room = findOrCreateRoom();
	room.addPlayer('h1', () => {});
	room.setStatus('playing');

	room.removePlayer('h1');
	check('D. la room est detruite', room.destroyed === true);
	check('D. registre vide', roomCount() === 0);
}

report();
