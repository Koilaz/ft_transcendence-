export const gameConfig = {
	bots: ['mistral_medium', 'mistral_big', 'mistral_small'],//bots ajoutes dans l'ordre
	turnPerRound: 2,   // nombre de tours par manche
	turnDuration: 10,   // secondes par tour
	maxPlayers: 6,
	minPlayers: 4,
	startingTimer: 10,
	maxRounds: 2, // nombre de manche
	scoreboardDuration: 10,
	roomCloseDelayMs: 10000, // ms : lecture du classement avant destruction
};
/*
available bots (cles du registre dans agents/index.js) :
	mistral_medium
	mistral_big
	mistral_small
	mistral_7B_local
*/
