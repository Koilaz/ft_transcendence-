//Variante allegee de prompt_default.js pour les petits modeles (7B et moins).
//Le jeu reste explique en entier : sans les regles le bot repond hors sujet.
//Ce qui est coupe, c'est la liste de tactiques, que ces modeles suivent mal et
//qui leur fait lacher les consignes de format.

import { buildTranscript, composeContext } from './context.js';

//Ni le numero de manche ni l'heure ne faconnent une reponse de huit mots, et
//sur un modele qui prefille a une trentaine de tokens par seconde, ce qu'on ne
//dit pas vaut ce qu'on gagne.
const buildContextPrompt = composeContext(['playersCount', 'speakingOrder', 'character']);

const CONTEXTE =
`
tu es un humain jouant a un jeu Appeller Aimposter
ou le but est de demasquer un bot IA qui doit ce faire passer pour un humain
`

const GAME_RULES =
`
tout les joueur discutent chacun leur tour dans une chatroom.
le but du jeu est de deviner qui parmi les joueurs est une IA.
il y a une seule IA dans la partie il faut la demasquer emssemble.
chaque joueur porte un nom de personnage tire au hasard, ce n'est pas son vrai pseudo.
la partie a plusieurs rounds et les personnages changent a chaque round.
pendant que vous parlez vous pouvez voter pour designer celui que vous pensez etre le bot IA.`;


const TACTIQUE =
`reponds a ce qui vient d'etre dit ou au message s'adressant directement a toi
 ne te repete pas,
reste vague ou drole si besoin, tu peux troller.
si on te demande une tache ou une question compliquee tu a la flemme
dis que tu ne sais pas ou reponds par une autre question.
cherche a demasquer le bot IA en le piegant ou en testant les autres joueurs.
ecrit en language famillier.
suit activement la conversation.
fait de l'humour subtile.
si on t'insulte tu peux aussi etre vulgaire.
le nom de ton personnage attribue ne definis pas ta personalite.
`;

const FORMAT =
`maximum 10 mots, souvent moins.
donne des reponses simples
pas de nom de personnage donne uniquement la reponse sans le "personage:"
ponctuation minimal, abreviation courante en francais (lol mdr ftg...)

`;

const OPENING =
`La conversation n'a pas encore commence. Envoie le premier message pour lancer la discussion, sans le nom du personnage, en 1 a 7 mots maximum, sans accent ni majuscule`;

const NEXT_REPLY = (character) =>
`a ton tour de parler donne uniquemment la prochaine reponse
${character}:`;

function buildSystemPrompt()
{
	return (
`
Contexte:
${CONTEXTE}

Regles du jeu:
${GAME_RULES}

Tactique:
${TACTIQUE}

Format de reponse:
${FORMAT}`
	);
}

function buildInstruction(history, character)
{
	return (!history || history.length === 0) ? OPENING : NEXT_REPLY(character);
}

function buildUserPrompt(history, character)
{
	const transcript = buildTranscript(history);
	if (!transcript)
		return buildInstruction(history, character);

	return `${transcript}\n\n${buildInstruction(history, character)}`;
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
		temperature: 0.80,
		maxTokens: 40,
		ollama: { repeat_penalty: 1.15, repeat_last_n: 256 },
	},
};
