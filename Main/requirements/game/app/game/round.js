import { CARACTERS, shuffle } from './room.js';
import { gameConfig } from './config.js';

// Une manche : personnage + ordre de jeu tirés au sort, jamais réutilisés d'une manche à l'autre.
export class Round {
	constructor(players, broadcastFn, addSystemMessageFn, onRoundEndedFn)
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
	//  - son tour en cours, s'il l'avait, se termine normalement par un silence
	//    au bout de turnDuration, comme n'importe quel joueur muet
	//  - ses tours suivants sont sautes (voir startTurn)
	//  - la manche suivante est construite sans lui, puisque Room l'a deja
	//    retire de sa Map avant de nous appeler
	removePlayer(playerId)
	{
		if (!this.playerById.has(playerId) || this.leftPlayers.has(playerId))
			return false;
		this.leftPlayers.add(playerId);
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
		const playerId = this.turnOrder[this.turnIndex];

		//O4 : on saute le tour d'un joueur parti.
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
				return this.endRound(); // Ajout systeme de vote
		}
		this.startTurn();
	}

    onPlayerVote(playerId, targetCharacter)
    {
        // 1. Sécurités de base
        if (this.status !== 'chatting') return;
        if (this.votes.has(playerId)) return; // Le joueur a déjà voté

        const player = this.playerById.get(playerId);
        if (!player || player.agentName) return; // L'IA ne vote pas

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

        // 6. Feedback silencieux au joueur
        player.send({ type: 'voteRegistered' });
    }

	endRound()
    {
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
                humanScore = 1000 + Math.floor(speedRatio * 1000);
            }
			else
			{
				humanScore = 0;
                aiRoundScore += 500;
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

        // Retrouver l'IA pour l'afficher
        const aiPlayer = this.players.find(p => p.agentName);
        const aiCharacter = this.caracterOf(aiPlayer.id);

        results.push({
            playerId: aiPlayer.id,
            character: aiCharacter,
            target: "A dupé les humains", // Texte stylisé pour le tableau
            score: aiRoundScore,
            isCorrect: true, // Pour l'afficher en vert
            isAI: true
        });

        results.sort((a, b) => a.score - b.score);

        // Diffuser les résultats à tous les joueurs
        this.broadcast({
			type: 'roundTransition'
        });
		if (this.onRoundEnded)
		{
            this.onRoundEnded(results);
        }

        console.log(`[room] Fin de la manche. (Calcul des scores secret terminé)`);

        // (Optionnel) ajouter ici un appel à la Room si on
        // veux enchaîner sur un autre round automatiquement.
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
			totalTurns: this.turnPerRound,
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

	//Arret net de la manche, appele par Room.destroy. On coupe le chrono et
	//rien d'autre : il n'y a pas de fin de manche a jouer quand la room ferme.
	stop()
	{
		if (this.turnTimerId)
		{
			clearInterval(this.turnTimerId);
			this.turnTimerId = null;
		}
	}
}
