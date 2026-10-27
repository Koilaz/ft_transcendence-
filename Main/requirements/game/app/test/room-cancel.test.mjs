// Un bot dont le disjoncteur saute fait annuler sa manche : pas de points, un
// nouveau healthcheck, puis le lobby si un bot de la partie est KO, la manche
// suivante sinon. Sans cle ni modele, chaque healthCheck repond KO tout de
// suite : aucun appel reseau. Les variables sont lues au chargement des
// agents, d'ou les imports dynamiques.
delete process.env.MISTRAL_API_KEY;
delete process.env.OLLAMA_MODEL;

const { gameConfig } = await import('../game/config.js');
const { createRoom, roomCount } = await import('../game/room.js');
const { check, report } = await import('./check.mjs');

gameConfig.roundTransitionDelay = 1;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ------------------------------- A. bot mort, agent KO : retour au lobby
// Un agent absent du registre fait echouer l'appel en erreur fatale.
{
	const room = createRoom([[{ agent: 'agent_mort', prompt: 'prompt_easy' }]]);
	const recus = [];
	room.addPlayer('h1', (m) => recus.push(m));
	room.addPlayer('h2', () => {});
	const bot = [...room.players.values()].find((p) => p.agentName);

	// Ni tour muet ni phrase toute faite : l'agent est bien appele
	const random = Math.random;
	Math.random = () => 0.5;
	room.startNewRound();
	const round = room.currentRound;
	// Un bon vote, qui rapporterait des points si la manche etait comptee
	room.submitVote('h1', round.caracterOf(bot.id));
	await bot.sendFn({ type: 'yourTurn', countdown: 1 });
	Math.random = random;

	check('A. l erreur fatale arrete la manche', round.status === 'stopped');
	check('A. les joueurs sont prevenus', recus.some((m) => m.type === 'roundCancelled'));
	await wait(50);
	check('A. un bot KO ferme la room avec agent_failure',
		recus.find((m) => m.type === 'roomClosed')?.code === 'agent_failure');
	check('A. la manche annulee ne rapporte aucun point', room.players.get('h1').score === 0);
	check('A. registre vide', roomCount() === 0);
}

// ------------------ B. echec revenu apres la fin de la manche : rien a annuler
{
	const room = createRoom([]);
	const recus = [];
	room.addPlayer('h1', (m) => recus.push(m));
	room.addPlayer('h2', () => {});
	room.startNewRound();
	const round = room.currentRound;
	round.stop();
	room.cancelRound(round);

	check('B. aucune annonce', !recus.some((m) => m.type === 'roundCancelled'));
	check('B. la partie continue', !room.destroyed && room.status === 'playing');
	room.destroy('game_finished');
}

// ------------------ C. healthcheck OK : la partie passe a la manche suivante
// Room sans bot : aucun bot de la partie n'est KO, quel que soit le rapport.
{
	const room = createRoom([]);
	const recus = [];
	room.addPlayer('h1', (m) => recus.push(m));
	room.addPlayer('h2', () => {});
	room.startNewRound();
	const manche1 = room.currentRound;
	room.cancelRound(manche1);
	check('C. la room attend le healthcheck en transition', room.status === 'transition');

	await wait(gameConfig.roundTransitionDelay * 1000 + 300);
	check('C. la manche annulee compte : place a la manche 2',
		room.roundNumber === 2 && room.currentRound !== manche1 && room.currentRound.status === 'chatting');
	check('C. la room reste ouverte', !room.destroyed);

	// Annulee, la derniere manche clot la partie normalement
	gameConfig.maxRounds = room.roundNumber;
	recus.length = 0;
	room.cancelRound(room.currentRound);
	await wait(50);
	check('C. derniere manche annulee : classement final', recus.some((m) => m.type === 'gameEnd'));
	check('C. puis fermeture normale',
		recus.find((m) => m.type === 'roomClosed')?.code === 'game_finished');
	check('C. registre vide', roomCount() === 0);
}

report();
