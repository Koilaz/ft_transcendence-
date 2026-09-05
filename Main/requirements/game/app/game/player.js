// Identité persistante d'un joueur (humain ou IA), stable sur toute la room.
export class Player
{
	constructor(id, sendFn, { isAI = false, agentName = null } = {}) {
		this.id = id;
		this.sendFn = sendFn;
		this.status = 'waiting';
		this.currentCaractere;
		this.isViewer = false;
		this.isAI = false;
		this.agentName = agentName;
		this.score = 0;
	}

	send(message) {
		if (this.sendFn)
			this.sendFn(message);
	}
}
