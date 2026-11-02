export const gameConfig = {
	bots: ['mistral_medium', 'mistral_big', 'mistral_small'],//bots ajoutes dans l'ordre
	turnPerRound: 5,   // nombre de tours par manche
	turnDuration: 10,   // secondes par tour
	maxPlayers: 6,
	minPlayers: 4,
	startingTimer: 10,
	maxRounds: 3,
	scoreboardDuration: 10,
};
/*
available bots (cles du registre dans agents/index.js) :
	mistral_medium
	mistral_big
	mistral_small
	mistral_7B_local
*/
