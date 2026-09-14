export const gameConfig = {
	bots: ['ministral_14b'],//bots ajoutes dans l'ordre
	turnPerRound: 5,   // nombre de tours par manche
	turnDuration: 12,   // secondes par tour
	maxPlayers: 4,
	minPlayers: 3,          // seuil pour DEMARRER une partie
	minPlayersToContinue: 3, // seuil pour CONTINUER une partie deja lancee
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
	ministral_14b
	mistral_7B_local
*/
