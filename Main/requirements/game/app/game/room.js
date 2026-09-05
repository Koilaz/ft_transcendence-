import { Player } from './player.js';
import { Round } from './round.js';
import { createBotSendFn } from './bot.js';
import { gameConfig } from './config.js';

export const CARACTERS = ['Colonel Moutarde', 'Major Wasabi', 'Caporal Mayo', 'Lieutenant Samourai', 'General Ketchup', 'Marechal Cocktail'];

const rooms = new Map(); //id -> room
let nextRoomId = 1;

//Cree une room peuplee de ses bots et l'enregistre. Elle recoit ensuite son
//effectif humain definitif en une fois, depuis queue.js : il n'y a plus de
//remplissage progressif, donc plus de room qui attend des joueurs.
export function createRoom()
{
	const room = new Room(nextRoomId++);
	rooms.set(room.id, room);
	room.addBots();
	return room;
}

//O2 : la Map rooms est privee au module. Seule porte d'entree pour le code
//exterieur (server.js, tests) qui doit pouvoir fermer une room.
export function deleteRoom(roomId, reason = 'game_finished')
{
	const room = rooms.get(roomId);
	if (!room)
		return false;
	room.destroy(reason);
	return true;
}

//Nombre de rooms vivantes. Sert a verifier qu'aucune ne fuit apres une partie.
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
		//L'effectif est fixe par queue.js avant le lancement : ajouter un joueur
		//ne declenche plus ni compte a rebours ni demarrage de manche.
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
	//pleine : sinon une liste trop longue ne laisserait aucune place aux humains.
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

		//O4 : le Round garde ses propres copies des joueurs (piege 2 du TODO).
		//Sans cet appel, le tour du joueur parti arriverait quand meme et le
		//serveur enverrait `yourTurn` dans le vide.
		if (this.currentRound)
			this.currentRound.removePlayer(playerId);

		//O5 : plus aucun humain, la room ne sert plus a rien. Ce test passe avant
		//les autres : les motifs de fermeture ci-dessous s'adressent aux joueurs
		//restants, et il n'y en a plus. Il rattrape aussi le cas ou le quorum de
		//continuation ne s'applique pas (statut endGame, seuil a 1).
		if (this.humanCount === 0)
			return this.destroy('empty_room');

		//A4 : minPlayers est un seuil de DEMARRAGE, minPlayersToContinue un
		//seuil de CONTINUATION. Le quorum ne vaut que pour une partie en cours :
		//une fois endGame atteint, la fermeture est deja programmee avec le bon
		//motif (game_finished), qu'il ne faut pas devancer sous peine de couper
		//la lecture du classement pour les autres.
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

	//B3 : ce champ etait maintenu a la main en parallele de players.size et
	//pouvait diverger (removePlayer decrementait meme pour un joueur absent).
	//bot.js l'injecte dans le prompt du LLM ("il y a N joueurs dans cette
	//partie") : une valeur fausse degrade la credibilite du bot. Un getter
	//supprime la possibilite meme de la divergence.
	get numberOfPlayer()
	{
		return this.players.size;
	}

	//O5 : players.size ne tombe JAMAIS a zero. Le bot n'a pas de socket, donc
	//removePlayer n'est jamais appele pour lui : une room desertee garde son
	//bot indefiniment. Seul le nombre d'humains dit si la room sert encore.
	//On teste agentName, comme partout ailleurs dans le code (le champ isAI de
	//Player vaut toujours false, voir B9 du plan).
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

		//B1 : sans ceci la room et ses timers resteraient en memoire indefiniment.
		//On laisse le temps de lire le classement, puis on ferme ; les joueurs
		//sont alors renvoyes vers la file d'attente par server.js.
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

	//O1 : fermeture definitive de la room.
	//L'ordre des quatre etapes n'est pas negociable :
	//  1. diffuser tant que les joueurs sont encore joignables
	//  2. couper le timer de la room
	//  3. couper le chrono du tour en cours
	//  4. sortir du registre
	//Diffuser apres le retrait reviendrait a emettre dans le vide ; sortir du
	//registre sans couper les timers laisserait un setInterval diffuser sur une
	//room que plus personne ne reference.
	destroy(reason = 'game_finished')
	{
		if (this.destroyed)
			return;
		this.destroyed = true;

		//1. le code est une chaine machine : le front choisit le texte
		this.broadcast({ type: 'roomClosed', code: reason });

		//2. timer de la room (compte a rebours de demarrage ou de scoreboard)
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

		//3. chrono du tour en cours
		if (this.currentRound)
			this.currentRound.stop();

		//4. plus rien ne peut retrouver la room
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
