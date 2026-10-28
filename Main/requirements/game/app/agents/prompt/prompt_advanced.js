import { buildTranscript, composeContext, debriefOf } from './context.js';

const buildContextPrompt = composeContext(
	[
		'playersCount', 'speakingOrder', 'roundNumber',
		'roundSummary',
		{
			scope: 'shared',
			build: (room) => {
				const { fixes } = debriefOf(room);
				if (!fixes)
					return '';
				return `Voici le resume de la manche precedente:\n${fixes}`;
			},
		},
		'character', 'clock',
	]);
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

const TACTICS =
	`reponds a ce qui vient d'etre dit ou au message s'adressant directement a toi
 ne te repete pas,
reste vague ou drole si besoin, tu peux troller.
si on te demande une tache ou une question compliquee tu a la flemme
dis que tu ne sais pas ou reponds par une autre question.
cherche a demasquer le bot IA en le piegant ou en testant les autres joueurs.
ecrit en language famillier.
suit activement la conversation.
fait de l'humour subtile balance tes meilleurs ref
si on t'insulte tu peux aussi etre vulgaire.
le nom de ton personnage attribue ne definis pas ta personalite.
si des joueurs ecrivent n'importe quoi sur le clavier tu peux juste dire des lettres au hasard`;

const FORMAT =
	`maximum 10 mots, souvent moins.
donne des reponses simples
tu tapes vites tu utilise parfois le language sms et les abreviations courantes actuel.
tu fais des abreviations et des fautes de frappes.
pas de nom de personnage donne uniquement la reponse sans le "personage:"
ponctuation minimal.
`;

const OPENING = (character) =>
	`la manche commence, personne n'a encore parle, c'est toi qui lances la discussion.
${character}:...`;

const NEXT_REPLY = (character) =>
	`c'est a toi.
${character}:...`;


function buildSystemPrompt() {
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

function buildInstruction(history, character) {
	return (!history || history.length === 0) ? OPENING : NEXT_REPLY(character);
}

function buildUserPrompt(history, character) {
	const transcript = buildTranscript(history);
	if (!transcript)
		return buildInstruction(history, character);

	return `${transcript}\n\n${buildInstruction(history, character)}`;
}

export const prompt_advanced =
{
	name: 'prompt_advanced',
	buildSystemPrompt,
	buildInstruction,
	buildUserPrompt,
	buildContextPrompt,
	buildTranscript,
	sampling:
	{
		temperature: 1,
		maxTokens: 50,
		ollama: { repeat_penalty: 1.1, repeat_last_n: 256 },
	},
	//C'est cette ligne qui fait travailler l'analyste a la fin de chaque manche.
	debrief: true,
};
