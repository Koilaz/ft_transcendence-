// Identité persistante d'un joueur (humain ou IA), stable sur toute la room.
export class Player
{
	constructor(id, sendFn, { isAI = false, agentName = null, promptName = null, botRounds = null, displayName = null } = {}) {
		this.id = id;
		this.displayName = displayName;//Pseudo choisi par le joueur. il n'apparait qu'au classement
		this.sendFn = sendFn;
		this.connected = true;
		this.status = 'waiting';
		this.currentCaractere;
		//this.isViewer = false;
		//this.isAI = false;
		this.agentName = agentName;
		this.promptName = promptName;
		this.botRounds = botRounds;
		this.score = 0;
	}

	send(message) {
		if (this.sendFn)
			this.sendFn(message);
	}
}
