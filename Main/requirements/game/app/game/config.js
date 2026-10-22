
export const DEFAULT_PROMPT = 'prompt_default';

export const gameConfig = {
	//bots ajoutes dans l'ordre. Trois ecritures, au choix, pour chaque bot :
	//	'ministral_14b'                                       agent + prompt par defaut
	//	{ agent: 'local_agent', prompt: 'prompt_easy' }        agent + prompt choisi
	//	{ rounds: ['ministral_14b', { agent, prompt }, ...] }  un bot par manche, dans
	//	                                                      l'ordre ; la derniere entree
	//	                                                      vaut pour les manches suivantes
	bots: [{
		rounds: [
			{ agent: 'local_agent', prompt: 'prompt_test' },
			{ agent: 'mistral_small', prompt: 'prompt_test_advanced' }, // manche 1
			{ agent: 'mistral_medium', prompt: 'prompt_test_advanced' }, // manche 2
			{ agent: 'mistral_big', prompt: 'prompt_test_advanced' }, // manche 3
			//{ agent: 'mistral_big', prompt: 'prompt_test' }, // manche 4
		]
	}],
	turnPerRound: 5,   // nombre de tours par manche
	turnDuration: 17,   // secondes par tour
	maxMessageLength: 120, // caracteres par message de chat, au-dela le serveur tronque
	maxPlayers: 6,
	minPlayers: 3,          // seuil pour DEMARRER une partie
	minPlayersToContinue: 3, // seuil pour CONTINUER une partie deja lancee
	startingTimer: 5,       // secondes apres que tous les joueurs sont prets
	maxRounds: 3, // nombre de manche
	roundTransitionDelay: 5,
	debriefMaxWaits: 5,//Prolongations du tableau des scores accordees a l'analyse d'apres-manche
};
/*
available agents (cles du registre dans agents/index_agent.js) :
	mistral_medium
	mistral_big
	mistral_small
	ministral_14b
	local_agent

available prompts (cles du registre dans agents/prompt/index_prompt.js) :
	prompt_default   prompt complet, pour les gros modeles
	prompt_easy      version allegee, pour les petits modeles (7B et moins)
	prompt_basic     prompt d'origine, un seul bloc sans sections ni exemples
	prompt_advanced  prompt_default + debrief
	prompt_test      prompt de travail
	prompt_test_advanced
					prompt_test en immersion totale : le bot ne se sait jamais
					 IA, il se croit un joueur qui la cherche. Meme note
					 d'apres-manche, correctifs reformules.
*/

function botEntry(bot) {
	if (typeof bot === 'string')
		return { agent: bot, prompt: DEFAULT_PROMPT };
	return { agent: bot.agent, prompt: bot.prompt ?? DEFAULT_PROMPT };
}


export function botEntries(bots = gameConfig.bots) {
	return bots.map((bot) => (bot.rounds?.length ? bot.rounds : [bot]).map(botEntry));
}
