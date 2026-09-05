// Etape 5 : destruction des rooms orphelines (O5).
// Le piege : players.size ne tombe jamais a zero, le bot n'ayant pas de socket
// n'est jamais retire. C'est le nombre d'humains qui compte.
import { createRoom, roomCount } from '../game/room.js';
import { check, report } from './check.mjs';

// ------------------------------------------------ A. le bot ne compte pas
{
	const room = createRoom();
	check('A. la room neuve contient deja son ou ses bots', room.players.size > 0);
	check('A. mais aucun humain', room.humanCount === 0);

	room.addPlayer('h1', () => {});
	check('A. humanCount ignore les bots', room.humanCount === 1);
	room.destroy('game_finished');
}

// ------- B. dernier humain parti : O5 passe avant le quorum, et surtout
//            couvre le cas ou players.size ne vaudra jamais zero
{
	const msgs = [];
	const room = createRoom();
	room.addPlayer('h1', (m) => msgs.push(m));
	room.setStatus('playing');

	// Le partant est retire de players AVANT la diffusion, il ne peut donc pas
	// recevoir roomClosed. On observe depuis le bot, seul membre restant.
	const bot = [...room.players.values()].find((p) => p.agentName);
	const botMsgs = [];
	bot.sendFn = (m) => botMsgs.push(m);

	msgs.length = 0;
	room.removePlayer('h1');
	check('B. la room est detruite', room.destroyed === true);
	check('B. motif empty_room, pas not_enough_players',
		botMsgs.find((m) => m.type === 'roomClosed')?.code === 'empty_room');
	check('B. le partant ne recoit rien', msgs.length === 0);
	check('B. registre vide, plus de fuite', roomCount() === 0);
	check('B. players.size n etait pourtant PAS a zero', room.players.size > 0);
}

// ------------------- C. il reste un humain : O5 ne se declenche pas.
//    Statut endGame pour isoler O5 du quorum de continuation, qui ne
//    s'applique qu'aux statuts playing et scoreboard.
{
	const room = createRoom();
	room.addPlayer('h1', () => {});
	room.addPlayer('h2', () => {});
	room.setStatus('endGame');

	room.removePlayer('h2');
	check('C. la room survit tant qu il reste un humain', room.destroyed === false);
	check('C. humanCount a jour', room.humanCount === 1);

	room.destroy('game_finished');
	check('C. registre vide', roomCount() === 0);
}

report();
