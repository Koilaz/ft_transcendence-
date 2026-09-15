// Etape 1 : Room.destroy(), le registre et ses accesseurs.
import { createRoom, deleteRoom, roomCount } from '../game/room.js';
import { Round } from '../game/round.js';
import { gameConfig } from '../game/config.js';
import { check, report } from './check.mjs';

const received = [];
const room = createRoom();
room.addPlayer('h1', (msg) => received.push(msg));

// Depuis l'etape 7, addPlayer ne lance plus aucun timer : l'effectif est fixe
// par la file d'attente. On arme donc le compte a rebours a la main, comme le
// fait handleRoundEnd pour le scoreboard, afin de verifier que destroy le coupe.
room.launchStartTimer(gameConfig.scoreboardDuration);

check('room enregistree dans le registre', roomCount() === 1);
check('la room contient ses bots et son humain', room.players.size === gameConfig.bots.length + 1);
check('numberOfPlayer suit players.size', room.numberOfPlayer === room.players.size);
check('timer arme', room.timerId !== null);

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
const room2 = createRoom();
check('deleteRoom ferme une room existante', deleteRoom(room2.id) === true);
check('deleteRoom sur id inconnu renvoie false', deleteRoom(99999) === false);
check('registre vide', roomCount() === 0);

// La room ferme pendant que le bot genere sa reponse. Sa reponse arrive apres
// coup et ne doit pas relancer la manche d'une room morte.
{
	const room3 = createRoom();
	const humain = [];
	room3.addPlayer('h1', (m) => humain.push(m));
	const bot = [...room3.players.values()].find((p) => p.agentName);
	bot.sendFn = () => {};   // aucun appel a l'agent

	const round = new Round([...room3.players.values()], (m) => room3.broadcast(m), () => {}, () => {});
	round.turnOrder = [bot.id, 'h1'];
	room3.currentRound = round;
	round.start();

	room3.destroy('not_enough_players');
	humain.length = 0;
	room3.addMessage(bot.id, 'reponse tardive');
	check('la reponse tardive du bot est jetee', humain.length === 0);
	check('aucun tour relance apres destroy', round.turnTimerId === null);
}

report();
