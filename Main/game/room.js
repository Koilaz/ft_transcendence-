import { Player } from './player.js';
import { Round } from './round.js';
import { createBotSendFn } from './bot.js';

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
	newRoom.addBot();
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
		this.maxPlayers = 5;
		this.minPlayers = 3;
		this.isRunning = false;
		this.timer = 10;
		this.countdown = null;
		this.timerId = null;
		this.status = "waiting";//(waiting, chating, voting, shuffeling, endGame)
	}

	addPlayer(playerId, sendFn, opts = {})
	{
		const player = new Player(playerId, sendFn, opts);
		this.players.set(playerId, player);
		if(this.players.size >= this.minPlayers && !this.timerId && this.status === 'waiting')
			this.launchStartTimer(this.timer);
		if(this.isFull())
		{
			this.startNewRound();
		}
		this.broadcastState();
		return player;
	}

	addBot(agentName = 'mistral')
	{
		const botId = `bot-${this.id}`;
		const sendFn = createBotSendFn(this, botId, agentName);
		this.addPlayer(botId, sendFn, { isAI: true, agentName });
	}

	removePlayer(playerId)
	{
		this.players.delete(playerId);
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
		this.setStatus('Playing');
		const round = new Round([...this.players.values()], (msg) => this.broadcast(msg));
		this.currentRound = round;
		this.rounds.push(round);
		round.start();
		return round;
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

/*
Player : identité réelle et persistante (id, connexion, IA ou non).
Round : créée à chaque nouvelle manche via Room.startNewRound(). Elle tire au sort assignments (playerId → personnage)
Room : garde les Player (identité) dans une Map stable, et un historique de rounds.*/
