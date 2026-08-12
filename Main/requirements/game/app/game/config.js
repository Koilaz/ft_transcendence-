export const gameConfig = {
	bots: ['mistral_medium', 'mistral_big', 'mistral_small'],//bots ajoutes dans l'ordre
	turnPerRound: 10,   // nombre de tours par manche
	turnDuration: 17,   // secondes par tour
	maxPlayers: 6,
	minPlayers: 4,
	startingTimer: 10,
	votingDuration: 45,
};
/*
available bots (cles du registre dans agents/index.js) :
	mistral_medium
	mistral_big
	mistral_small
	mistral_7B_local
*/
