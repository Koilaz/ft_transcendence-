import { Player } from './player.js';
import { Round } from './round.js';
import { createBotSendFn } from './bot.js';
import { gameConfig } from './config.js';

//#TODO geree les deconnection proprement

export const CARACTERS = ['Colonel Moutarde', 'Major Wasabi', 'Caporal Mayo', 'Lieutenant Samourai', 'General Ketchup', 'Marechal Cocktail'];

const rooms = new Map(); //id -> room
let nextRoomId = 1;

export function findOrCreateRoom() {
	for (const room of rooms.values()) {
		if (!room.isFull())
			return room;
	}
	const newRoom = new Room(nextRoomId++);
	rooms.set(newRoom.id, newRoom);
	newRoom.addBots();
	return newRoom;
}

class Room
{
	constructor(id)
	{
		this.id = id;
		this.history = [];
		this.players = new Map(); // playerId -> Player, identite persistante
		this.rounds = [];
		this.currentRound = null;
		this.roundNumber = 0;
		this.maxPlayers = gameConfig.maxPlayers;
		this.minPlayers = gameConfig.minPlayers;
		this.isRunning = false;
		this.startingTimer = gameConfig.startingTimer;
		this.countdown = null;
		this.timerId = null;
		this.status = "waiting";//(waiting, chating, voting, shuffeling, endGame)
		this.numberOfPlayer = 0;
	}

	addPlayer(playerId, sendFn, opts = {})
	{
		const player = new Player(playerId, sendFn, opts);
		this.numberOfPlayer++;
		this.players.set(playerId, player);
		if(this.players.size >= this.minPlayers && !this.timerId && this.status === 'waiting')
			this.launchStartTimer(this.startingTimer);
		if(this.isFull())
		{
			this.startNewRound();
		}
		this.broadcastState();
		return player;
	}

	addBot(agentName = 'mistral_medium')
	{
		const botId = `bot-${this.id}-${this.players.size}`;
		const sendFn = createBotSendFn(this, botId, agentName);
		this.addPlayer(botId, sendFn, { isAI: true, agentName });
	}

	//Peuple la room a partir de gameConfig.bots. On s'arrete si la room est
	//pleine : sinon une liste trop longue remplirait la room de bots, findOrCreateRoom
	//la verrait pleine et en creerait une autre a chaque joueur qui arrive.
	addBots(agentNames = gameConfig.bots)
	{
		for (const agentName of agentNames)
		{
			if (this.isFull())
			{
				console.warn(`[room ${this.id}] room pleine : bot ${agentName} ignore`);
				break;
			}
			this.addBot(agentName);
		}
	}

	removePlayer(playerId)
	{
		this.players.delete(playerId);
		this.numberOfPlayer--;
		if(this.timerId && this.players.size < this.minPlayers)
		{
			clearInterval(this.timerId);
			this.timerId = null;
			this.countdown = null;
			this.setStatus('waiting');
			return;
		}
		this.broadcastState();
	}

	addSystemMessage(text)
	{
		this.history.push({ sender: 'Système', text });
	}

	addMessage(sender, text)
	{
		if (!this.currentRound || this.currentRound.status !== 'chatting')
			return;

		if (!this.currentRound.canSpeak(sender))
			return;

		const character = this.currentRound.caracterOf(sender);
		this.history.push({ sender: character, text });
		this.broadcast({ type: 'chat', sender: character, text });

		this.currentRound.onPlayerMessage(sender)
	}

	broadcast(message)
	{
		for (const player of this.players.values())
		player.send(message);
	}

	setStatus(status)
	{
		this.status = status;
		this.broadcastState();
	}

	broadcastState() //Public
	{
		this.broadcast
		({
			type: 'state',
			status: this.status,
			players: this.players.size,
			room_number: this.id,
			countdown: this.countdown
		});
	}

	isFull()
	{
		return this.players.size >= this.maxPlayers;
	}

	canStart()
	{
		return this.players.size >= this.minPlayers;
	}

	startNewRound()
	{
		if (this.timerId)
		{
			clearInterval(this.timerId);
			this.timerId = null;
			this.countdown = null;
		}
		this.roundNumber++;
		this.setStatus('playing');
		const round = new Round([...this.players.values()],
								(msg) => this.broadcast(msg),
								(text) => this.addSystemMessage(text),
								(results) => this.handleRoundEnd(results));
		this.currentRound = round;
		this.rounds.push(round);

		//#TMP a supprimer : qui se cache derriere quel personnage a ce round.
		//Les personnages sont tires au sort dans le constructeur de Round, donc
		//c'est lisible des maintenant, avant le premier tour.
		console.log(`----- [room ${this.id}] round ${this.roundNumber} : attributions -----`);
		for (const playerId of round.turnOrder)
		{
			const player = this.players.get(playerId);
			console.log(`  ${round.caracterOf(playerId).padEnd(22)} = ${playerId} (${player.agentName ?? 'humain'})`);
		}
		console.log('--------------------------------------------------');

		round.start();
		return round;
	}
	/* Ajout systeme de vote */

	handleRoundEnd(results) 
    {
        // 1. Ajouter les points des résultats aux scores globaux des joueurs
        for (const res of results) {
            const player = this.players.get(res.playerId);
            if (player) {
                player.score += res.score;
            }
        }

      
        const maxRounds = gameConfig.maxRounds;
        
        if (this.roundNumber >= maxRounds) {
            this.endGame();
        } else {
			
            this.setStatus('scoreboard');
        
            this.launchStartTimer(gameConfig.scoreboardDuration);
        }
    }

    endGame() 
    {
        this.setStatus('endGame');
        
		const finalRanking = [...this.players.values()].map(p => ({
            playerId: p.id,
            score: p.score,
            isAI: !!p.agentName
        })).sort((a, b) => b.score - a.score);

        this.broadcast({
            type: 'gameEnd',
            ranking: finalRanking,
            winnerId: finalRanking[0].playerId
        });
    }

	launchStartTimer(timer)
	{
		if (this.timerId)
			return;
		this.countdown = timer;
		this.timerId = setInterval(() =>
		{
			this.countdown--;
			this.broadcastState();
			if (this.countdown <= 0)
			{
				clearInterval(this.timerId);
				this.timerId = null;
				this.countdown = null;
				this.startNewRound();
			}
		}, 1000);
	}
	/* Ajoute systeme de vote */
	submitVote(playerId, targetCharacter)
	{
		if (this.currentRound && this.currentRound.status === 'chatting')
		{
			this.currentRound.onPlayerVote(playerId, targetCharacter);
		}
	}
}


/*Fisher-Yates Shuffle algo*/
export function shuffle(array)
{
	const arr = [...array];
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[arr[i], arr[j]] = [arr[j], arr[i]];
	}
	return arr;
}

export { Room };
