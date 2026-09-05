// Etape 2 : retrait d'un joueur de la manche en cours (O4, piege 2).
import { Round } from '../game/round.js';
import { findOrCreateRoom, roomCount } from '../game/room.js';
import { check, report } from './check.mjs';

// ------------------------------------------------------------- Round isole
// Faux joueurs : Round n'utilise que .id, .agentName et .send(). Les
// construire a la main evite de lancer une vraie manche, donc un appel au LLM.
const sent = [];
const mk = (id, agentName = null) => ({ id, agentName, send: (m) => sent.push({ to: id, type: m.type }) });
const players = [mk('h1'), mk('h2'), mk('bot', 'mistral_medium')];

const round = new Round(players, () => {}, () => {}, () => {});
round.turnOrder = ['h1', 'h2', 'bot'];   // ordre fige pour un test deterministe

round.start();
check('la manche demarre sur h1', round.currentPlayer.id === 'h1');

// h2 se deconnecte pendant le tour de h1
check('removePlayer renvoie true la premiere fois', round.removePlayer('h2') === true);
check('removePlayer est idempotent', round.removePlayer('h2') === false);
check('h2 marque comme parti', round.leftPlayers.has('h2'));

// B6 : les getters excluent le partant du calcul des scores
check('humanPlayers exclut h2', JSON.stringify(round.humanPlayers.map((p) => p.id)) === '["h1"]');
check('expectedVotes recalcule a 1', round.expectedVotes === 1);

// h1 parle -> fin de son tour -> celui de h2 doit etre saute
sent.length = 0;
round.onPlayerMessage('h1');
check('le tour de h2 est saute, on passe au bot', round.currentPlayer.id === 'bot');
check('h2 ne recoit pas yourTurn', !sent.some((s) => s.to === 'h2' && s.type === 'yourTurn'));
check('le bot recoit bien yourTurn', sent.some((s) => s.to === 'bot' && s.type === 'yourTurn'));

// C'est ce qui rend B4 et B5 structurellement impossibles : rien n'est retire
check('turnOrder intact (indices non decales)', JSON.stringify(round.turnOrder) === '["h1","h2","bot"]');
check('playerById intact', round.playerById.size === 3);
check('h2 garde son personnage (historique coherent)', typeof round.caracterOf('h2') === 'string');

round.stop();   // sinon le chrono de tour empeche le process de sortir

// -------------------------------------------------------- cablage cote Room
const room = findOrCreateRoom();
let notified = null;
// Le faux Round doit exposer stop() : Room.destroy l'appelle.
room.currentRound = { removePlayer: (id) => { notified = id; }, stop: () => {} };
// Deux humains, pour qu'il en reste un apres le depart : sinon O5 detruirait
// la room et ce test ne mesurerait plus le cablage vers le Round.
room.addPlayer('humain-1', () => {});
room.addPlayer('humain-2', () => {});

room.removePlayer('humain-1');
check('Room.removePlayer previent le Round en cours', notified === 'humain-1');
check('le joueur est retire de la Map de la room', !room.players.has('humain-1'));
check('la room survit tant qu il reste un humain', room.destroyed === false);

room.destroy('game_finished');
check('registre vide', roomCount() === 0);

report();
