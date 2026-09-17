//Le prompt attribue a un bot qui n'en precise aucun. C'est une cle du registre
//de prompts (agents/prompt/index_prompt.js).
export const DEFAULT_PROMPT = 'prompt_default';

export const gameConfig = {
	//bots ajoutes dans l'ordre. Trois ecritures, au choix, pour chaque bot :
	//	'ministral_14b'                                       agent + prompt par defaut
	//	{ agent: 'local_agent', prompt: 'prompt_easy' }        agent + prompt choisi
	//	{ rounds: ['ministral_14b', { agent, prompt }, ...] }  un bot par manche, dans
	//	                                                      l'ordre ; la derniere entree
	//	                                                      vaut pour les manches suivantes
	bots: [{ agent: 'local_agent', prompt: 'prompt_basic' }],
	turnPerRound: 5,   // nombre de tours par manche
	turnDuration: 20,   // secondes par tour
	maxPlayers: 4,
	minPlayers: 3,          // seuil pour DEMARRER une partie
	minPlayersToContinue: 3, // seuil pour CONTINUER une partie deja lancee
	startingTimer: 10,
	maxRounds: 2, // nombre de manche
	scoreboardDuration: 10,
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
*/

function botEntry(bot)
{
	if (typeof bot === 'string')
		return { agent: bot, prompt: DEFAULT_PROMPT };
	return { agent: bot.agent, prompt: bot.prompt ?? DEFAULT_PROMPT };
}

//gameConfig.bots accepte plusieurs ecritures pour rester lisible. Tout le reste
//du code ne voit que la forme complete : pour chaque bot, la liste de ses
//{ agent, prompt } par manche, jamais vide — un seul element pour un bot qui ne
//change pas. Un `rounds` vide retombe sur un bot sans agent, que le rapport de
//sante signale. Recalcule a chaque appel, comme le reste — la config bouge, et
//les tests la modifient.
export function botEntries(bots = gameConfig.bots)
{
	return bots.map((bot) => (bot.rounds?.length ? bot.rounds : [bot]).map(botEntry));
}
