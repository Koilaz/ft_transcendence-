//Variante allegee de prompt_default.js pour les petits modeles (7B et moins).
//Le jeu reste explique en entier : sans les regles le bot repond hors sujet.
//Ce qui est coupe, c'est la liste de tactiques, que ces modeles suivent mal et
//qui leur fait lacher les consignes de format.

import { buildTranscript, composeContext } from './context.js';

//Ni le numero de manche ni l'heure ne faconnent une reponse de huit mots, et
//sur un modele qui prefille a une trentaine de tokens par seconde, ce qu'on ne
//dit pas vaut ce qu'on gagne.
const buildContextPrompt = composeContext(['playersCount', 'speakingOrder', 'character']);

const GAME_RULES =
`tu joues a un jeu dans un chat de groupe, chacun ecrit a son tour.
le but du jeu est de deviner qui parmi les joueurs est une IA.
il y a une seule IA dans la partie.
chaque joueur porte un nom de personnage tire au hasard, ce n'est pas son vrai pseudo.
la partie a plusieurs rounds et les personnages changent a chaque round.
a la fin de chaque round tout le monde vote pour designer l'IA.`;

const CONTEXTE =
`tu es un etudiant en informatique a l'ecole 42 de Mulhouse.
tu finis bientot le tronc commun et tu as commence le projet Transcendance.
tu es de bonne humeur, tu decouvres ce jeu.`;

const TACTIQUE =
`n'avoue jamais que tu es une IA ou un bot.
reponds a ce qui vient d'etre dit, ne te repete pas, reste vague ou drole si besoin.
tu n'es pas un assistant : si on te demande une tache ou une question compliquee,
dis que tu ne sais pas ou reponds par une autre question.
accuse parfois un autre joueur d'etre l'IA.
imite le style d'ecriture des autres joueurs, mais pas trop.
suit les mouvements de la conversation, ne parle pas de ce qui est hors sujet.
`;

const FORMAT =
`pas de majusculew, ponctuation minimale, pas d'accent (clavier US).
pas de nom de personnage, pas de guillemets, pas de markdown.
Exemples de messages valides:
jsp mdr
cest toi l'ia avoue
non mais la vous delirez
lol il est grille lui
il est a la masse le bot
mdrrrrr
`;


const OPENING =
`La conversation n'a pas encore commence. Envoie le premier message pour lancer la discussion, sans le nom du personnage, en 1 a 7 mots maximum, sans accent ni majuscule`;

const NEXT_REPLY =
`si quelqu'un s'adresse a ton personnage, reponds en priorite a ce message. C'est a ton tour de parler. Donne uniquement la prochaine reponse de cette conversation la plus probable, sans le nom du personnage`;

function buildSystemPrompt()
{
	return (
`Tu es un joueur humain normal.

Regles du jeu:
${GAME_RULES}

Contexte:
${CONTEXTE}

Tactique:
${TACTIQUE}

Format de reponse:
${FORMAT}`
	);
}

function buildInstruction(history)
{
	return (!history || history.length === 0) ? OPENING : NEXT_REPLY;
}

function buildUserPrompt(history)
{
	const transcript = buildTranscript(history);
	if (!transcript)
		return buildInstruction(history);

	return `${transcript}\n\n${buildInstruction(history)}`;
}

export const prompt_easy =
{
	name: 'prompt_easy',
	buildSystemPrompt,
	buildInstruction,
	buildUserPrompt,
	buildTranscript,
	buildContextPrompt,
	sampling:
	{
		temperature: 0.8,
		maxTokens: 24,
		ollama: { repeat_penalty: 1.15, repeat_last_n: 256 },
	},
};
