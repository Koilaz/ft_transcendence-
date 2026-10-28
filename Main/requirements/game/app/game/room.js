import { Player } from './player.js';
import { Round } from './round.js';
import { createBotSendFn } from '../agents/bot.js';
import { normalizeMessage } from '../agents/postTreatment.js';
import { gameConfig, botEntries } from './config.js';
import { preheatAgent, checkAllAgents, unavailableBots } from '../agents/index_agent.js';
import { getPrompt } from '../agents/prompt/index_prompt.js';
import { requestDebrief } from '../agents/prompt/debrief.js';

//Il en faut au moins gameConfig.maxPlayers : Round.assignCaracters se sert dans
//cette liste, et les joueurs en trop repartiraient sans personnage.
export const CARACTERS = ['Colonel Moutarde', 'Major Wasabi', 'Caporal Poivre', 'Lieutenant Mayo',
						  'General Ketchup', 'Marechal Cocktail'];

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
		this.roundEndTimerId = null;
		this.status = "waiting";//(waiting, chating, voting, shuffeling, endGame)
		this.destroyed = false;
		this.debrief = null;//note de l'Agent analyste
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

	//Donne au bot l'agent et le prompt prevus pour cette manche, avec un
	//disjoncteur neuf meme si le bot ne change pas : la mort d'un bot ne vaut
	//que pour sa manche, qu'elle l'annule (voir cancelRound) ou qu'elle soit
	//deja finie quand sa reponse revient.
	applyBotRound(player, roundNumber)
	{
		const { agent, prompt } = this.botOfRound(player, roundNumber);
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

	//Une coupure ne retire pas le joueur de la manche : ses tours gardent leur
	//duree normale, son vote et son score restent attaches au meme Player.
	disconnectPlayer(playerId)
	{
		const player = this.players.get(playerId);
		if (this.destroyed || !player || !player.connected || player.agentName)
			return false;
		if (!this.currentRound || !['playing', 'transition'].includes(this.status))
		{
			player.send({ type: 'roomClosed', code: 'reconnect_expired' });
			this.removePlayer(playerId);
			return false;
		}
		player.connected = false;
		const character = this.currentRound.caracterOf(playerId);
		this.addSystemMessage(`${character} est déconnecté. Sa place reste réservée.`);
		this.broadcast({ type: 'playerDisconnected', character, temporary: true });
		return true;
	}

	reconnectPlayer(playerId, sendFn)
	{
		const player = this.players.get(playerId);
		if (this.destroyed || !player || player.agentName || !this.currentRound)
			return false;
		const wasDisconnected = !player.connected;
		player.connected = true;
		player.sendFn = sendFn;
		const round = this.currentRound;
		const character = round.caracterOf(playerId);
		if (wasDisconnected)
			this.addSystemMessage(`${character} est de retour.`);
		//Un seul instantane remplace l'etat du navigateur. Ne jamais transmettre
		//history tel quel : ses indicateurs isAI reveleraient l'imposteur.
		player.send({
			type: 'reconnected',
			state: this.publicState(),
			character,
			history: this.history.map(({ sender, text }) => ({ sender, text })),
			turn: round.status === 'chatting' ? round.publicTurn() : null,
			roundPhase: round.status,
			hasVoted: round.votes.has(playerId),
			// Le joueur a vote pour ce personnage : c'est son propre choix,
			// pas un secret (isCorrect reste cote serveur).
			votedFor: round.votes.get(playerId)?.targetCharacter ?? null,
			disconnectedCharacters: [...this.players.values()]
				.filter((p) => !p.connected).map((p) => round.caracterOf(p.id)),
			leftCharacters: [...round.leftPlayers].map((id) => round.caracterOf(id)),
			debriefWaiting: this.debriefWaits > 0,
		});
		if (wasDisconnected)
		{
			//Le revenant a deja cette ligne dans son historique restaure.
			for (const other of this.players.values())
				if (other.id !== playerId)
					other.send({ type: 'playerReconnected', character });
		}
		return true;
	}

	//Fin de la fenetre de retour. On retire tous les absents ensemble pour
	//decider correctement du quorum, notamment quand tous les humains sont partis.
	expireDisconnectedPlayers()
	{
		const absent = [...this.players.values()].filter((p) => !p.connected);
		for (const player of absent)
			player.send({ type: 'roomClosed', code: 'reconnect_expired' });
		if (absent.length)
			this.removePlayers(absent.map((p) => p.id));
		return !this.destroyed;
	}

	removePlayer(playerId)
	{
		this.removePlayers([playerId]);
	}

	removePlayers(playerIds)
	{
		if (this.destroyed)
			return;
		//Le personnage se lit avant tout nettoyage. assignments n'est jamais
		//modifie, mais le partant doit sortir de players avant la diffusion :
		//il n'a plus rien a recevoir.
		const departing = playerIds.filter((id) => this.players.has(id))
			.map((id) => ({ id, character: this.currentRound?.caracterOf(id) ?? null }));
		if (!departing.length)
			return;
		for (const { id } of departing)
			this.players.delete(id);
		//La fermeture se decide avant de prevenir la manche : retirer le joueur
		//peut passer la parole au bot, et une room condamnee n'a pas a lancer
		//d'appel a l'agent.
		if (this.humanCount === 0)
			return this.destroy('empty_room');
		if ((this.status === 'playing' || this.status === 'transition')
			&& this.players.size < gameConfig.minPlayersToContinue)
			return this.destroy('not_enough_players');
		for (const { id, character } of departing)
		{
			if (this.currentRound)
				this.currentRound.removePlayer(id);
			//Le tour saute a pu clore la derniere manche, donc la partie et la room
			if (this.destroyed)
				return;
			if (character)
				this.broadcast({ type: 'playerDisconnected', character, temporary: false });
		}
		this.broadcastState();
	}

	addSystemMessage(text)
	{
		this.history.push({ sender: 'Systeme', text });
		this.globalHistory.push({ sender: 'Systeme', text, isAI: false});
	}

	//Un joueur muet apparait dans le fil comme « ... » : ce message doit etre
	//dans l'historique pour etre restitue au refresh, exactement comme un chat.
	addSilenceMessage(character)
	{
		const msgData = { sender: character, text: '...', isAI: false };
		this.history.push(msgData);
		this.globalHistory.push(msgData);
	}

	addMessage(sender, text)
	{
		if (!this.currentRound || this.currentRound.status !== 'chatting')
			return;

		if (!this.currentRound.canSpeak(sender))
			return;

		const character = this.currentRound.caracterOf(sender);
		const player = this.players.get(sender);
		if (!player || !player.connected)
			return;
		text = normalizeMessage(text);
		if (!text)
			return;// que des emojis ou des symboles : il ne reste rien a envoyer
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
		this.broadcast(this.publicState());
	}

	publicState()
	{
		return {
			type: 'state',
			status: this.status,
			players: this.players.size,
			room_number: this.id,
			countdown: this.countdown,
			current_manche: this.roundNumber,
			max_manches: gameConfig.maxRounds
		};
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
		if (this.destroyed || !this.expireDisconnectedPlayers())
			return;
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
								(results) => this.handleRoundEnd(results),
								(character) => this.addSilenceMessage(character));
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
		if (this.destroyed || this.roundEndTimerId || !this.expireDisconnectedPlayers())
			return;
	// 1. Ajouter les points des résultats aux scores globaux des joueurs
	    for (const res of results) {
	        const player = this.players.get(res.playerId);
	        if (player) {
	            player.score += res.score;
	        }
	    }


        const maxRounds = gameConfig.maxRounds;

        if (this.roundNumber < maxRounds)
		{
            requestDebrief(this, results);
			this.debriefWaits = 0;
        }

		this.roundEndTimerId = setTimeout(() => {
			this.roundEndTimerId = null;
			if (this.destroyed)
				return;
            if (this.roundNumber >= maxRounds) {
                this.endGame();
            } else {
                this.setStatus('transition');
                this.launchStartTimer(gameConfig.roundTransitionDelay);
            }
        }, 4000);
    }

	//Le bot de cette manche ne repond plus (voir agents/bot.js) : la manche
	//s'arrete sans points mais compte comme jouee, et le healthcheck est
	//relance. Un bot de la partie hors service renvoie tout le monde au lobby,
	//sinon la partie reprend comme apres une manche normale.
	//round est la manche ou le bot a ete appele : sa reponse a pu revenir une
	//fois la manche finie, il n'y a alors plus rien a annuler.
	async cancelRound(round)
	{
		if (round.status !== 'chatting')
			return;
		round.stop();
		console.log(`[room ${this.id}] manche ${this.roundNumber} annulee : le bot ne repond plus`);
		this.addSystemMessage("Manche annulée : l'IA ne répond plus. Vérification technique en cours.");
		this.broadcast({ type: 'roundCancelled' });
		this.setStatus('transition');
		await checkAllAgents();
		//Les joueurs ont pu partir pendant le healthcheck.
		if (this.destroyed)
			return;
		//Tous les bots de la room, toutes manches confondues, au format de
		//gameConfig.bots : le meme tri que celui de la file.
		const bots = [...this.players.values()].filter((p) => p.botRounds)
			.map((p) => ({ rounds: p.botRounds }));
		if (unavailableBots(bots).length)
			return this.destroy('agent_failure');
		if (this.roundNumber >= gameConfig.maxRounds)
			return this.endGame();
		this.launchStartTimer(gameConfig.roundTransitionDelay);
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
		if (this.destroyed)
			return;
		if (this.debriefPending && this.debriefWaits < gameConfig.debriefMaxWaits)
		{
			this.debriefWaits++;
			//Une chaine machine et deux compteurs : c'est le front qui ecrit le
			//texte, comme pour roomClosed.
			this.broadcast({ type: 'debriefWait', attempt: this.debriefWaits, max: gameConfig.debriefMaxWaits });
			return this.launchStartTimer(gameConfig.roundTransitionDelay);
		}

		this.startNewRound();
	}

    endGame()
    {
		if (this.destroyed)
			return;
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
		if (this.destroyed || this.timerId)
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
		if (this.players.get(playerId)?.connected && this.currentRound?.status === 'chatting')
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
		if (this.roundEndTimerId)
		{
			clearTimeout(this.roundEndTimerId);
			this.roundEndTimerId = null;
		}
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
