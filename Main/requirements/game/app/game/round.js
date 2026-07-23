import { CARACTERS, shuffle } from './room.js';
import { gameConfig } from './config.js';

// Une manche : personnage + ordre de jeu tirés au sort, jamais réutilisés d'une manche à l'autre.
export class Round {
	constructor(players, broadcastFn, addSystemMessageFn)
	{
		this.players = players;
		this.broadcast = broadcastFn; // injectee par la Room : Round ignore tout du transport
		this.addSystemMessage = addSystemMessageFn; // idem, pour ecrire dans l'historique
		this.assignments = new Map(); // playerId -> personnage (secret interne)
		this.turnOrder = [];          // playerId dans l'ordre de jeu, apres shuffle
		this.playerById = new Map(players.map((player) => [player.id, player])); //acces a l'objet player via son ID

		this.turnPerRound = gameConfig.turnPerRound; //nombre de tours
		this.turnDuration = gameConfig.turnDuration; //second par tour

		this.status = 'chatting'
		this.turnCycle = 0;
		this.turnIndex = 0;
		this.countdown = null;
		this.turnTimerId = null;
		this.currentPlayer = null;

		this.assignCaracters();
		this.assignTurnOrder();
	}

	start() //Lance une manche
	{
		this.notifyAssignments();
		this.turnCycle = this.turnPerRound;
		this.turnIndex = 0;
		this.startTurn();
	}

	startTurn()
	{
		const playerId = this.turnOrder[this.turnIndex];
		this.currentPlayer = this.playerById.get(playerId);
		this.countdown = this.turnDuration
		this.currentPlayer.send({ type: 'yourTurn', countdown: this.countdown });
		this.broadcastTurn();
		this.turnTimerId = setInterval(() =>
		{
			this.countdown--;
			if (this.countdown <= 0)
				return this.onTurnTimeout();
			this.broadcastTurn();
		}, 1000);
	}

	// événement A : le joueur courant a parlé (appelé par Room.addMessage)
	onPlayerMessage(playerId)
	{
		if (this.turnOrder[this.turnIndex] !== playerId)
			return;// une machine à états ne fait confiance à personne
		this.endTurn();
	}

	// événement B : son chrono a expiré
	onTurnTimeout()
	{
		const character = this.caracterOf(this.currentPlayer.id);
		this.broadcast({ type: 'silence', character });
		this.addSystemMessage(`${character} est resté muet ce tour...`);
		this.endTurn();
	}

	endTurn()
	{
		if (this.turnTimerId)
		{
			clearInterval(this.turnTimerId);   // annule le perdant de la course A/B
			this.turnTimerId = null;
		}
		this.advanceTurn();
	}

	advanceTurn()
	{
		this.turnIndex++;
		if (this.turnIndex >= this.turnOrder.length)
		{
			this.turnIndex = 0;
			this.turnCycle--;
			if (this.turnCycle <= 0)
				return this.startVotingPhase();
		}
		this.startTurn();
	}

	startVotingPhase()
	{
		this.status = 'voting';
		this.currentPlayer = null;
		this.broadcast({ type: 'roundState', status: this.status });
		console.log('phase de vote !');        // #TODO phase de vote
	}

	canSpeak(playerId)
	{
		if (this.status === 'chatting' && this.turnOrder[this.turnIndex] === playerId )
			return true
		return false
	}

	notifyAssignments()
	{
		for (const player of this.players)
		{
			player.send(
			{
				type: 'assignment',
				character: this.caracterOf(player.id),
			});
		}
	}

	broadcastTurn()
	{
		this.broadcast(
		{
			type: 'turn',
			character: this.caracterOf(this.currentPlayer.id),  // un nom, jamais d'id
			countdown: this.countdown,
			turnCycle: this.turnCycle,
			turnOrder: this.publicTurnOrder(),
		});
	}

	assignCaracters()
	{
		const pool = shuffle(CARACTERS).slice(0, this.players.length); //#TODO analyse cette ligne
		this.players.forEach((player, i) =>
		{
			this.assignments.set(player.id, pool[i]);
		});
	}

	assignTurnOrder()
	{
		this.turnOrder = shuffle(this.players.map((p) => p.id));
	}

	caracterOf(playerId)
	{
		return this.assignments.get(playerId);
	}

	publicTurnOrder()
	{
		return this.turnOrder.map((id) => this.caracterOf(id));
	}
}


	/*setStatus(status)
	{
		this.status = status;
		this.broadcastState();
	}

	broadcastState()
	{
		this.broadcast // TODO use room broadcast
		({
			type: 'roundState',
			status: this.status,
			currentTurn: this.currentTurn,
			currentCharacter: this.caracterOf(this.currentPlayer.id),
			countdown: this.countdown
		});
	}*/
