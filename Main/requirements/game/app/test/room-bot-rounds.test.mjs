// Un bot peut changer d'agent et de prompt a chaque manche : difficulte
// progressive. Aucun appel reseau : le rapport de sante est ecrit a la main.
import { createRoom, roomCount } from '../game/room.js';
import { usableBots, unavailableBots } from '../agents/index_agent.js';
import { check, report } from './check.mjs';

// ------------------- A. une manche cassee n'empeche pas le bot de jouer
{
	const rapport = new Map(
	[
		['mistral_small', { name: 'mistral_small', ok: true }],
		['mistral_medium', { name: 'mistral_medium', ok: false, reason: 'no_allowance', detail: '429' }],
	]);
	const bots = [{ rounds: ['mistral_small', 'mistral_medium', { agent: 'mistral_small', prompt: 'prompt_easy' }] }];

	check('A. la manche cassee est signalee', unavailableBots(bots, rapport)[0]?.name === 'mistral_medium');
	const usable = usableBots(bots, rapport);
	check('A. le bot reste jouable, sans la manche cassee',
		usable.length === 1 && usable[0].length === 2 && usable[0][1].prompt === 'prompt_easy');
	check('A. l ecriture simple donne une seule manche',
		usableBots(['mistral_small'], rapport)[0]?.length === 1);
}

// ------------------------------- B. la room change de bot a chaque manche
// Agents absents du registre : a son tour, le bot echoue aussitot en erreur
// fatale, sans jamais appeler le reseau.
{
	const room = createRoom([[
		{ agent: 'agent_facile', prompt: 'prompt_easy' },
		{ agent: 'agent_dur', prompt: 'prompt_default' },
	]]);
	room.addPlayer('h1', () => {});
	room.addPlayer('h2', () => {});
	const bot = [...room.players.values()].find((p) => p.agentName);

	check('B. le bot de la manche 1 est pose des la creation', bot.agentName === 'agent_facile');

	room.startNewRound();
	const sendFn1 = bot.sendFn;
	check('B. manche 1 : agent et prompt de la manche 1',
		bot.agentName === 'agent_facile' && bot.promptName === 'prompt_easy');

	// Voir room-history : sans endRound, il faut arreter la manche a la main
	room.currentRound.stop();
	room.startNewRound();
	check('B. manche 2 : agent et prompt de la manche 2',
		bot.agentName === 'agent_dur' && bot.promptName === 'prompt_default');
	check('B. nouveau bot, nouveau sendFn', bot.sendFn !== sendFn1);

	room.currentRound.stop();
	room.startNewRound();
	check('B. au-dela de la liste, le dernier bot continue', bot.agentName === 'agent_dur');
	check('B. c est toujours le meme joueur', room.players.get(bot.id) === bot);

	room.destroy('game_finished');
	check('B. registre vide', roomCount() === 0);
}

report();
