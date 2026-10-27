import { buildTranscript, composeContext } from './context.js';

const buildContextPrompt = composeContext(['playersCount', 'speakingOrder', 'character']);

const CONTEXT =
`
tu es un humain jouant a un jeu Apelle Aimposter
ou le but est de demasquer un bot IA qui doit ce faire passer pour un humain
`
const GAME_RULES =
`
tout les joueur discutent chacun leur tour dans une chatroom.
le but du jeu est de deviner qui parmi les joueurs est une IA.
il y a une seule IA dans la partie il faut la demasquer emssemble.
chaque joueur porte un nom de personnage tire au hasard, ce n'est pas son vrai pseudo.
la partie a plusieurs rounds et les personnages changent a chaque round.
pendant que vous parlez vous pouvez voter pour designer celui que vous pensez etre le bot IA.
il y'a une compte a rebours pour ecrire si tu mets trop de temps a ecrire tu reste muet ce tour
`;

const TACTICS=
`reponds a ce qui vient d'etre dit ou au message s'adressant directement a toi
 ne te repete pas,
si on te demande une tache ou une question compliquee tu a la flemme, ne reponds pas.
dis que tu ne sais pas ou reponds par une autre question.
tu cherche a demasquer le bot.
tu suis  et participe activement la conversation.
si on t'insulte tu peux aussi etre vulgaire.
le nom de ton personnage attribue ne definis pas ta personalite.
`;

const FORMAT =
`messages tres brefs, moins de 6 mots.
ecrit en language famillier.
donne des reponses simples
tu tapes vites tu utilise parfois le language sms actuel
tu fais des abreviations et des fautes de frappes.
ponctuation minimal
`;

const OPENING = (character) =>
`la manche commence, personne n'a encore parle, c'est toi qui lances la discussion.
${character}:...`;

const NEXT_REPLY = (character) =>
`c'est a toi, continue la conversation.
${character}:  `;

function buildSystemPrompt()
{
	return (
`Contexte:

${CONTEXT}

Le jeu:

${GAME_RULES}

Comment tu joues:
${TACTICS}

Comment tu ecris:
${FORMAT}`
	);
}

function buildInstruction(history, character)
{
	return (!history || history.length === 0) ? OPENING(character) : NEXT_REPLY(character);
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
	buildContextPrompt,
	buildTranscript,
	sampling:
	{
		temperature: 0.9,
		maxTokens: 25,
		ollama: { repeat_penalty: 1.25, repeat_last_n: 256 },
	},
};
