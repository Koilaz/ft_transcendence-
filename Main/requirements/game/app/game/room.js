import { Player } from './player.js';
import { Round } from './round.js';
import { createBotSendFn } from './bot.js';
import { gameConfig, botEntries } from './config.js';
import { preheatAgent } from '../agents/index_agent.js';
import { getPrompt } from '../agents/prompt/index_prompt.js';
import { requestDebrief } from '../agents/prompt/debrief.js';

//Il en faut au moins gameConfig.maxPlayers : Round.assignCaracters se sert dans
//cette liste, et les joueurs en trop repartiraient sans personnage.
export const CARACTERS = ['Colonel Moutarde', 'Major Wasabi', 'Caporal Mayo', 'Lieutenant Samourai',
						  'General Ketchup', 'Marechal Cocktail', 'Sergent Barbecue', 'Capitaine Tartare'];

const rooms = new Map(); //id -> room
let nextRoomId = 1;

//Cree une room peuplee de ses bots et l'enregistre. Elle recoit ensuite son
//effectif humain definitif en une fois, depuis queue.js
//bots permet a la file de n'injecter que les bots reellement exploitables, sous
//la forme complete de botEntries. Omis, on retombe sur gameConfig.bots.
export function createRoom(bots)
{
	const room = new Room(nextRoomId++);
	rooms.set(room.id, room);
	room.addBots(bots);
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
		this.globalHistory = []; // historique du chat
		this.players = new Map(); // playerId -> Player, identite persistante
		this.rounds = [];
		this.currentRound = null;
		this.roundNumber = 0;
		this.maxPlayers = gameConfig.maxPlayers;
		this.countdown = null;
		this.timerId = null;
		this.status = "waiting";//(waiting, chating, voting, shuffeling, endGame)
		this.destroyed = false;
		//La note que l'analyste ecrit entre deux manches : { summary, fixes }.
		//Elle est posee ici, sur la room, parce que les blocs de contexte la
		//lisent comme ils lisent history ou roundNumber — prompt/context.js
		//reste ainsi sans import et sans appel reseau.
		this.debrief = null;
		this.debriefPending = false;
		this.debriefWaits = 0;
	}

	addPlayer(playerId, sendFn, opts = {})
	{
		const player = new Player(playerId, sendFn, opts);
		this.players.set(playerId, player);
		this.broadcastState();
		return player;
	}

	//Un bot, c'est un agent et le prompt qu'on lui envoie, qui peuvent changer a
	//chaque manche. Le Player, lui, reste le meme toute la partie : meme id, meme
	//score. agentName marque l'imposteur pour le reste du jeu, le prompt ne sert
	//qu'a fabriquer ses messages.
	addBot(rounds)
	{
		const botId = `bot-${this.id}-${this.players.size}`;
		const player = this.addPlayer(botId, null, { isAI: true, botRounds: rounds });
		this.applyBotRound(player, 1);
	}

	//Le bot prevu pour cette manche ; au-dela de sa liste, le dernier continue.
	botOfRound(player, roundNumber)
	{
		const rounds = player.botRounds;
		return rounds[Math.min(roundNumber, rounds.length) - 1];
	}

	//Le prompt qu'aura ce joueur a la manche suivante, sans rien changer tout de
	//suite. L'analyse d'apres-manche est demandee a la fin d'une manche mais lue
	//a la suivante : c'est donc le prompt de la manche suivante qui decide s'il
	//faut la demander (voir prompt/debrief.js).
	nextRoundPromptOf(player)
	{
		if (!player.botRounds)
			return player.promptName;
		return this.botOfRound(player, this.roundNumber + 1).prompt;
	}

	//Donne au bot l'agent et le prompt prevus pour cette manche. Le sendFn n'est
	//recree que si le bot change : il repart avec un disjoncteur neuf, la panne
	//d'un agent ne condamne pas celui de la manche suivante.
	applyBotRound(player, roundNumber)
	{
		const { agent, prompt } = this.botOfRound(player, roundNumber);
		if (player.agentName === agent && player.promptName === prompt)
			return;
		player.agentName = agent;
		player.promptName = prompt;
		player.sendFn = createBotSendFn(this, player.id, { agent, prompt });
	}

	//Peuple la room a partir de gameConfig.bots. On s'arrete si la room est
	//pleine
	addBots(bots = botEntries())
	{
		for (const rounds of bots)
		{
			if (this.isFull())
			{
				console.warn(`[room ${this.id}] room pleine : bot ${rounds[0].agent} ignore`);
				break;
			}
			this.addBot(rounds);
		}
	}

	removePlayer(playerId)
	{
		//Le personnage se lit avant tout nettoyage. assignments n'est jamais
		//modifie, mais le partant doit sortir de players avant la diffusion :
		//il n'a plus rien a recevoir.
		const character = this.currentRound?.caracterOf(playerId) ?? null;
		this.players.delete(playerId);
		//La fermeture se decide avant de prevenir la manche : retirer le joueur
		//peut passer la parole au bot, et une room condamnee n'a pas a lancer
		//d'appel a l'agent.
		if (this.humanCount === 0)
			return this.destroy('empty_room');
		if ((this.status === 'playing' || this.status === 'transition')
			&& this.players.size < gameConfig.minPlayersToContinue)
			return this.destroy('not_enough_players');
		if (this.currentRound)
			this.currentRound.removePlayer(playerId);
		//Le tour saute a pu clore la derniere manche, donc la partie et la room
		if (this.destroyed)
			return;
		if (character)
			this.broadcast({ type: 'playerDisconnected', character });
		this.broadcastState();
	}

	addSystemMessage(text)
	{
		this.history.push({ sender: 'Systeme', text });
		this.globalHistory.push({ sender: 'Systeme', text, isAI: false});
	}

	addMessage(sender, text)
	{
		if (!this.currentRound || this.currentRound.status !== 'chatting')
			return;

		if (!this.currentRound.canSpeak(sender))
			return;

		const character = this.currentRound.caracterOf(sender);
		const player = this.players.get(sender);
		const msgData = { sender: character, text: text, isAI: !!player.agentName };

		this.history.push(msgData);
		this.globalHistory.push(msgData);

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
		//Avant le Round et le prechauffage : les deux lisent l'agent et le prompt
		//du bot sur son Player.
		for (const player of this.players.values())
		{
			if (player.botRounds)
				this.applyBotRound(player, this.roundNumber);
		}
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
			const identity = player.agentName ? `${player.agentName} + ${player.promptName}` : 'humain';
			console.log(`  ${round.caracterOf(playerId).padEnd(22)} = ${playerId} (${identity})`);
		}
		console.log('--------------------------------------------------');

		this.preheatBots();
		round.start();
		return round;
	}

	//Les personnages viennent d'etre tires, le contexte de la manche est donc
	//connu et ne bougera plus : c'est le premier instant ou les bots peuvent
	//preparer leur prompt, et le plus tot est le mieux — un bot qui parle en
	//deuxieme gagne un tour entier d'avance.
	//Sans await : le prechauffage dure plus longtemps qu'un tour.
	preheatBots()
	{
		for (const player of this.players.values())
		{
			if (!player.agentName)
				continue;

			const prompt = getPrompt(player.promptName);
			if (!prompt)
				continue;

			preheatAgent(player.agentName, player.promptName, prompt.buildContextPrompt(this, player.id));
		}
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
            return this.endGame();
        }

		//C'est le seul instant ou l'analyse a tout sous la main : history est
		//encore celle de la manche qui vient de finir (startNewRound la vide) et
		//results porte les votes. Sans await — la transition qui suit est
		//justement le temps qu'on lui laisse pour repondre.
		requestDebrief(this, results);
		this.debriefWaits = 0;
		this.setStatus('transition');
		this.launchStartTimer(gameConfig.scoreboardDuration);
    }

	//Fin du compte a rebours de transition. La manche suivante attend sa note :
	//le bot partira avec les correctifs de la precedente, ou sans. On prolonge
	//le tableau des scores au plus gameConfig.debriefMaxWaits fois — au-dela,
	//mieux vaut un bot generique qu'une salle qui regarde un ecran fige.
	//debriefPending est faux quand aucun bot ne veut de note, et il retombe en
	//moins d'une seconde quand l'API refuse (429, cle invalide) : seule une API
	//reellement lente declenche une prolongation, ce qui est sa raison d'etre.
	onTransitionElapsed()
	{
		if (this.debriefPending && this.debriefWaits < gameConfig.debriefMaxWaits)
		{
			this.debriefWaits++;
			//Une chaine machine et deux compteurs : c'est le front qui ecrit le
			//texte, comme pour roomClosed.
			this.broadcast({ type: 'debriefWait', attempt: this.debriefWaits, max: gameConfig.debriefMaxWaits });
			return this.launchStartTimer(gameConfig.scoreboardDuration);
		}

		this.startNewRound();
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
            winnerId: finalRanking[0].name,
			history: this.globalHistory
        });
		//Le front a tout ce qu'il faut pour afficher le classement : la room
		//n'a plus de raison de vivre, et tant qu'elle vit le joueur ne peut pas
		//repartir en file avec « Rejouer ».
		this.destroy('game_finished');
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
				//Le chrono est eteint avant la suite : onTransitionElapsed peut
				//decider de relancer ce meme timer, et launchStartTimer refuse
				//de demarrer tant que timerId n'est pas null.
				clearInterval(this.timerId);
				this.timerId = null;
				this.countdown = null;
				this.onTransitionElapsed();
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
