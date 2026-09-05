// L'historique sert uniquement de contexte au bot (bot.js est son seul
// lecteur). Comme les personnages sont retires au sort a chaque manche, un nom
// conserve d'une manche a l'autre designerait quelqu'un d'autre : le bot
// attribuerait des propos au mauvais joueur.
import { gameConfig } from '../game/config.js';

// Sans bot, la manche lancee donne le premier tour a un humain dont le sendFn
// est muet : aucun appel au LLM.
gameConfig.bots = [];

const { createRoom, roomCount } = await import('../game/room.js');
const { check, report } = await import('./check.mjs');

const room = createRoom();
room.addPlayer('h1', () => {});
room.addPlayer('h2', () => {});

room.startNewRound();

// L'ordre de jeu est tire au sort : seul le joueur du tour peut parler, il faut
// donc lui demander a lui, pas a un id choisi d'avance.
const round1 = room.currentRound;
const joueurDuTour = round1.turnOrder[round1.turnIndex];
const perso1 = round1.caracterOf(joueurDuTour);

room.addMessage(joueurDuTour, 'un message de la manche 1');
room.addSystemMessage('une ligne systeme');
check('la manche 1 remplit bien l historique', room.history.length === 2);
check('le message est enregistre sous un personnage, pas un playerId',
	room.history[0].sender === perso1 && perso1 !== joueurDuTour);

// En production, endRound coupe le chrono du tour avant que la manche suivante
// soit lancee. Ici on court-circuite ce cycle, il faut donc l'arreter a la main :
// sinon la manche 1 continue de tourner et atteint endRound, qui cherche un bot
// que ce test n'a pas.
round1.stop();

room.startNewRound();
check('la manche 2 repart d un historique vide', room.history.length === 0);
check('aucun nom de personnage de la manche 1 ne survit',
	!JSON.stringify(room.history).includes(perso1));

room.destroy('game_finished');   // coupe le chrono de tour
check('registre vide', roomCount() === 0);

report();
