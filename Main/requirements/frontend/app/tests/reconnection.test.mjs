import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

// Le runtime ne charge pas TypeScript nativement : ces modules n'ont que des
// imports de types, effaces par transpileModule. On charge ainsi le reducer
// reel du frontend, pas une copie qui deriverait.
async function loadTypeScript(path) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf-8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}

const { gameReducer, initialState, formatRoundIndicator, getBanner, getInputState } =
  await loadTypeScript('../src/services/gameState.ts');

const queueState = {
  type: 'state', status: 'waiting', room_number: null, countdown: 9,
  players: 2, min_players: 2, ready_players: 1, ready: false,
};

const roomState = {
  type: 'state', status: 'playing', room_number: 12, countdown: null,
  players: 4, current_manche: 2, max_manches: 4,
};

function playing(state) {
  return gameReducer(gameReducer(state, roomState), {
    type: 'assignment', character: 'Caporal Poivre',
  });
}

test('le state de la file peuple les compteurs du lobby', () => {
  const next = gameReducer(initialState, queueState);
  assert.equal(next.waitingPlayers, 2);
  assert.equal(next.minPlayers, 2);
  assert.equal(next.readyPlayers, 1);
  assert.equal(next.isReady, false);
  assert.equal(next.countdown, 9);
  assert.equal(next.roomStatus, 'waiting');
});

test('le ready du joueur se reflète dans son propre état', () => {
  const next = gameReducer(initialState, { ...queueState, ready: true, ready_players: 2 });
  assert.equal(next.isReady, true);
});

test('le state de la room garde le tour en cours et suit la manche serveur', () => {
  const withTurn = gameReducer(playing(initialState), {
    type: 'turn', character: 'Major Wasabi',
    turnOrder: ['Major Wasabi', 'Caporal Poivre'], turnCycle: 3, countdown: 15,
  });
  const next = gameReducer(withTurn, roomState);
  assert.equal(next.currentTurnCharacter, 'Major Wasabi');
  assert.equal(next.currentManche, 2);
  assert.equal(next.maxManches, 4);
  assert.equal(formatRoundIndicator(next.currentManche, next.maxManches), 'Manche 2/4');
});

test("l'assignment ouvre la manche et remet les votes a zero", () => {
  const voted = gameReducer(playing(initialState), { type: 'voteRegistered' });
  assert.equal(voted.hasVoted, true);
  const nextRound = gameReducer(voted, { type: 'assignment', character: 'Major Wasabi' });
  assert.equal(nextRound.hasVoted, false);
  assert.equal(nextRound.myCharacter, 'Major Wasabi');
  assert.equal(nextRound.roundResults, null);
  assert.ok(nextRound.messages.at(-1).text.includes('Major Wasabi'));
});

test("c'est mon tour : l'input est ouvert, sinon ferme", () => {
  const state = playing(initialState);
  const myTurn = gameReducer(state, { type: 'yourTurn', countdown: 15 });
  assert.equal(getInputState(myTurn, true).myTurn, true);
  const otherTurn = gameReducer(state, {
    type: 'turn', character: 'Major Wasabi',
    turnOrder: ['Major Wasabi', 'Caporal Poivre'], turnCycle: 3, countdown: 15,
  });
  assert.equal(getInputState(otherTurn, true).enabled, false);
});

test("l'instantane de reprise remplace l'etat sans reveler l'imposteur", () => {
  const snapshot = {
    type: 'reconnected',
    state: { status: 'playing', players: 4, room_number: 12, countdown: null,
             current_manche: 2, max_manches: 4 },
    character: 'Caporal Poivre',
    history: [
      { sender: 'Systeme', text: 'Colonel Moutarde est déconnecté. Sa place reste réservée.' },
      { sender: 'Lieutenant Mayo', text: 'bonjour' },
    ],
    turn: { character: 'Marechal Cocktail', turnOrder: ['Marechal Cocktail'], turnCycle: 2, countdown: 14 },
    roundPhase: 'chatting',
    hasVoted: true,
    disconnectedCharacters: ['Colonel Moutarde'],
    leftCharacters: [],
    debriefWaiting: false,
  };
  const before = gameReducer(playing(initialState), { type: 'voteRegistered' });
  const next = gameReducer(before, snapshot);
  assert.equal(next.myCharacter, 'Caporal Poivre');
  assert.equal(next.roomNumber, 12);
  assert.equal(next.hasVoted, true);
  assert.equal(next.currentTurnCharacter, 'Marechal Cocktail');
  assert.equal(next.countdown, 14);
  assert.equal(next.currentManche, 2);
  assert.equal(next.messages.length, 2);
  assert.equal(next.messages[0].kind, 'system');
  assert.equal(next.messages[1].kind, 'chat');
  assert.equal(next.messages[1].sender, 'Lieutenant Mayo');
  // jamais d'isAI dans le fil : le serveur le retire avant l'envoi
  assert.ok(next.messages.every((m) => !('isAI' in m)));
  assert.deepEqual(next.disconnectedCharacters, ['Colonel Moutarde']);
  assert.equal(next.leftCharacters.length, 0);
  // l'instantane ecrase les modales d'une vie anterieure
  assert.equal(next.roomClosedCode, null);
  assert.equal(next.endGameData, null);
});

test('un absent apparait, est signale, puis revient', () => {
  const state = playing(initialState);
  const gone = gameReducer(state, { type: 'playerDisconnected', character: 'Major Wasabi', temporary: true });
  assert.deepEqual(gone.disconnectedCharacters, ['Major Wasabi']);
  assert.ok(gone.messages.at(-1).text.includes('déconnecté'));
  const back = gameReducer(gone, { type: 'playerReconnected', character: 'Major Wasabi' });
  assert.deepEqual(back.disconnectedCharacters, []);
  assert.ok(back.messages.at(-1).text.includes('retour'));
});

test('fin de manche : les resultats tombent, la fermeture pose son code', () => {
  const state = playing(initialState);
  const results = [{ playerId: 'joueur-1', character: 'Caporal Poivre', target: null, score: 0, isCorrect: false, isAI: false }];
  const scored = gameReducer(state, { type: 'roundTransition', results, aiCharacter: 'Marechal Cocktail' });
  assert.equal(scored.roundResults, results);
  assert.equal(scored.aiCharacter, 'Marechal Cocktail');
  const closed = gameReducer(scored, { type: 'roomClosed', code: 'reconnect_expired' });
  assert.equal(closed.roomClosedCode, 'reconnect_expired');
});

test('resetGame remet la page dans son etat de depart', () => {
  const state = gameReducer(playing(initialState), { type: 'voteRegistered' });
  const next = gameReducer(state, { type: 'resetGame' });
  assert.deepEqual(next, initialState);
});

test('le bandeau annonce la reconnexion quand la liaison est coupee', () => {
  assert.equal(getBanner(initialState, false).text, 'Reconnexion en cours...');
  const queue = gameReducer(initialState, queueState);
  assert.equal(getBanner(queue, true).text, 'En attente de joueurs...');
});
