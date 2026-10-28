import { CARACTERS, shuffle } from './room.js';
import { gameConfig } from './config.js';

// Une manche : personnage + ordre de jeu tirés au sort, jamais réutilisés d'une manche à l'autre.
export class Round {
	constructor(players, broadcastFn, addSystemMessageFn, onRoundEndedFn, addSilenceFn)
	{
		this.players = players;
		this.broadcast = broadcastFn; // injectee par la Room : Round ignore tout du transport
		this.addSystemMessage = addSystemMessageFn; // idem, pour ecrire dans l'historique
		this.addSilence = addSilenceFn; // idem, pour les « ... » dans l'historique
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

		/* Ajout pour le systeme de vote en temps reel pendant les Round */
		this.onRoundEnded = onRoundEndedFn;
		this.roundStartTime = null;
        this.votes = new Map(); // Stockera : playerId -> { targetCharacter, isCorrect, timeElapsed, score }
		this.leftPlayers = new Set();
		this.assignCaracters();
		this.assignTurnOrder();
	}

	get humanPlayers()
	{
		return this.players.filter((p) => !p.agentName && !this.leftPlayers.has(p.id));
	}

	get expectedVotes()
	{
		return this.humanPlayers.length;
	}

	//Retire un joueur de la manche en cours, appele par Room.removePlayer.
	//On se contente de le marquer :
	//  - son tour en cours, s'il l'avait, passe aussitot au suivant : personne
	//    ne doit attendre turnDuration un joueur qui ne reviendra pas
	//  - ses tours suivants sont sautes (voir startTurn)
	//  - la manche suivante est construite sans lui, puisque Room l'a deja
	//    retire de sa Map avant de nous appeler
	removePlayer(playerId)
	{
		if (!this.playerById.has(playerId) || this.leftPlayers.has(playerId))
			return false;
		this.leftPlayers.add(playerId);
		if (this.status === 'chatting' && this.currentPlayer?.id === playerId)
			this.endTurn();
		return true;
	}

	start() //Lance une manche
	{
		this.notifyAssignments();
		this.turnCycle = this.turnPerRound;
		this.turnIndex = 0;
		this.roundStartTime = Date.now();
		this.startTurn();
	}

	startTurn()
	{
		if (this.status !== 'chatting')
			return;
		const playerId = this.turnOrder[this.turnIndex];

		if (this.leftPlayers.has(playerId))
			return this.advanceTurn();

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

	onPlayerMessage(playerId)
	{
		if (this.turnOrder[this.turnIndex] !== playerId)
			return;
		this.endTurn();
	}

	onTurnTimeout()
	{
		const character = this.caracterOf(this.currentPlayer.id);
		this.broadcast({ type: 'silence', character });
		this.addSystemMessage(`${character} est resté muet ce tour...`);
		//Persiste le « ... » dans l'historique pour le refresh. Optionnel :
		//les tests instancient Round sans ce callback.
		this.addSilence?.(character);
		this.endTurn();
	}

	endTurn()
	{
		if (this.turnTimerId)
		{
			clearInterval(this.turnTimerId);
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
				return this.endRound(); // Ajout systeme de vote
		}
		this.startTurn();
	}

    onPlayerVote(playerId, targetCharacter)
    {
        // 1. Sécurités de base
        if (this.status !== 'chatting') return;
        if (this.votes.has(playerId)) return;

        const player = this.playerById.get(playerId);
        if (!player || player.agentName) return;

        // 2. Retrouver l'ID de la cible désignée
        let targetId = null;
        for (const [id, char] of this.assignments.entries()) {
            if (char === targetCharacter) {
                targetId = id;
                break;
            }
        }
        if (!targetId) return;

        // 3. Vérifier si c'était la bonne personne (l'IA)
        const targetPlayer = this.playerById.get(targetId);
        const isCorrect = !!targetPlayer.agentName; // True si c'est l'IA

        // 4. Calcul du score
        const timeElapsed = Date.now() - this.roundStartTime;
        const score = isCorrect ? timeElapsed : 9999999;

        // 5. Sauvegarde du vote
        this.votes.set(playerId, { targetCharacter, isCorrect, timeElapsed, score });

        player.send({ type: 'voteRegistered', target: targetCharacter });
    }

    endRound()
    {
		if (this.status !== 'chatting')
			return;
        this.status = 'resolution';
        if (this.turnTimerId)
        {
            clearInterval(this.turnTimerId);
            this.turnTimerId = null;
        }

        const results = [];
		let aiRoundScore = 0;
		const maxTimeMs = this.turnPerRound * this.players.length * this.turnDuration * 1000;

        // Génération des scores pour chaque humain
        for (const human of this.humanPlayers) {
            const vote = this.votes.get(human.id);
            const characterName = this.caracterOf(human.id);
			let humanScore = 0;

            if (vote && vote.isCorrect)
			{
				const speedRatio = Math.max(0, 1 - (vote.timeElapsed / maxTimeMs));
                humanScore = 500 + Math.floor(speedRatio * 1000);
            }
			else
			{
				humanScore = 0;
                aiRoundScore += 1500;
            }
			results.push({
                playerId: human.id,
                character: characterName,
                target: vote ? vote.targetCharacter : null,
                score: humanScore,
                isCorrect: vote ? vote.isCorrect : false,
                isAI: false
            });
        }

        const aiPlayer = this.players.find(p => p.agentName);
        const aiCharacter = this.caracterOf(aiPlayer.id);
        const bestHumanScore = Math.max(0, ...results.map(result => result.score));

        results.push({
            playerId: aiPlayer.id,
            character: aiCharacter,
            target: aiRoundScore > bestHumanScore ? "A dupé les humains" : "Les humains ont résisté",
            score: aiRoundScore,
            isCorrect: true,
            isAI: true
        });

        results.sort((a, b) => b.score - a.score);

        // diffuse les résultats à tous les joueurs
        this.broadcast({
			type: 'roundTransition',
			results,
			aiCharacter,
        });
		if (this.onRoundEnded)
		{
            this.onRoundEnded(results);
        }

        console.log(`[room] Fin de la manche. (Calcul des scores secret terminé)`);

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
		this.broadcast(this.publicTurn());
	}

	publicTurn()
	{
		return {
			type: 'turn',
			character: this.caracterOf(this.currentPlayer.id),  // un nom, jamais d'id
			countdown: this.countdown,
			turnCycle: this.turnCycle,
			turnOrder: this.publicTurnOrder(),
			totalTurns: this.turnPerRound,
		};
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

	//Arret net de la manche, appele par Room.destroy et Room.cancelRound. Il
	//n'y a pas de fin de manche a jouer quand la room ferme ou que la manche est
	//annulee. Le statut compte autant que le chrono :
	//la reponse d'un bot encore en cours de generation arrive apres coup, et
	//tant que la manche se croit 'chatting' elle relancerait un tour.
	stop()
	{
		this.status = 'stopped';
		if (this.turnTimerId)
		{
			clearInterval(this.turnTimerId);
			this.turnTimerId = null;
		}
	}
}
