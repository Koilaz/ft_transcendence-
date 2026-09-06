import { Player } from './player.js';
import { Round } from './round.js';
import { createBotSendFn } from './bot.js';
import { gameConfig } from './config.js';

export const CARACTERS = ['Colonel Moutarde', 'Major Wasabi', 'Caporal Mayo', 'Lieutenant Samourai', 'General Ketchup', 'Marechal Cocktail'];

const rooms = new Map(); //id -> room
let nextRoomId = 1;

//Cree une room peuplee de ses bots et l'enregistre. Elle recoit ensuite son
//effectif humain definitif en une fois, depuis queue.js
//agentNames permet a la file de n'injecter que les bots reellement
//exploitables. Omis, on retombe sur gameConfig.bots.
export function createRoom(agentNames)
{
	const room = new Room(nextRoomId++);
	rooms.set(room.id, room);
	room.addBots(agentNames);
	return room;
}

export function deleteRoom(roomId, reason = 'game_finished')
{
	const room = rooms.get(roomId);
	if (!room)
		return false;
	room.destroy(reason);
	return true;
}

//Nombre de rooms vivantes
export function roomCount()
{
	return rooms.size;
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
		this.countdown = null;
		this.timerId = null;
		this.status = "waiting";//(waiting, chating, voting, shuffeling, endGame)
		this.destroyed = false;
		this.closeTimeoutId = null;
	}

	addPlayer(playerId, sendFn, opts = {})
	{
		const player = new Player(playerId, sendFn, opts);
		this.players.set(playerId, player);
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
	//pleine
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
		//Le personnage se lit avant tout nettoyage. assignments n'est jamais
		//modifie, mais le partant doit sortir de players avant la diffusion :
		//il n'a plus rien a recevoir.
		const character = this.currentRound?.caracterOf(playerId) ?? null;
		this.players.delete(playerId);
		if (this.currentRound)
			this.currentRound.removePlayer(playerId);
		if (character)
			this.broadcast({ type: 'playerDisconnected', character });
		if (this.humanCount === 0)
			return this.destroy('empty_room');
		if ((this.status === 'playing' || this.status === 'scoreboard')
			&& this.players.size < gameConfig.minPlayersToContinue)
			return this.destroy('not_enough_players');
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

	get numberOfPlayer()
	{
		return this.players.size;
	}

	get humanCount()
	{
		return [...this.players.values()].filter((p) => !p.agentName).length;
	}

	isFull()
	{
		return this.players.size >= this.maxPlayers;
	}

	startNewRound()
	{
		//Les personnages sont retires au sort a chaque manche : un meme nom ne
		//designe plus la meme personne. Le bot est le seul lecteur de history,
		//et la conserver lui ferait attribuer des propos au mauvais joueur.
		this.history = [];

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
            this.setStatus('transition');
            this.launchStartTimer(gameConfig.scoreboardDuration);
        }
    }

    endGame()
    {
        this.setStatus('endGame');
		const finalRanking = [...this.players.values()].map(p => ({
            playerId: p.id,
            name: p.agentName ? "L'AImpostor" : (p.displayName ?? p.id),
            score: p.score,
            isAI: !!p.agentName
        })).sort((a, b) => b.score - a.score);

        this.broadcast({
            type: 'gameEnd',
            ranking: finalRanking,
            winnerId: finalRanking[0].name
        });
		this.closeTimeoutId = setTimeout(() => this.destroy('game_finished'),
										 gameConfig.roomCloseDelayMs);
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

	// : fermeture definitive de la room.

	destroy(reason = 'game_finished')
	{
		if (this.destroyed)
			return;
		this.destroyed = true;
		this.broadcast({ type: 'roomClosed', code: reason });
		if (this.timerId)
		{
			clearInterval(this.timerId);
			this.timerId = null;
			this.countdown = null;
		}
		if (this.closeTimeoutId)
		{
			clearTimeout(this.closeTimeoutId);
			this.closeTimeoutId = null;
		}
		if (this.currentRound)
			this.currentRound.stop();
		rooms.delete(this.id);
		console.log(`[room ${this.id}] detruite (${reason})`);
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
