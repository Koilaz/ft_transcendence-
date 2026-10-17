//prompt_test en immersion totale : le bot ne lit jamais une phrase qui le
//designe comme l'IA. Il se croit un etudiant de 42 qui cherche l'IA, comme les
//autres joueurs.
//
//prompt_test lui dit a la fois "tu es un joueur humain" et "ne revele jamais
//que tu es une IA" : c'est la seconde qui l'emporte, il sait qu'il est l'IA et
//joue un humain. Ca donne un joueur qui se cache — trop sur la defensive, trop
//decontracte — alors que les vrais joueurs, eux, chassent. Un bot qui se croit
//chasseur accuse, tend des pieges et rit quand on l'accuse : il fait comme eux.
//
//Pour la meme raison, aucune consigne ne parle de ce qu'il ne doit pas etre
//(assistant, modele) : chaque mention le ramene a son registre d'assistant. Les
//comportements a eviter sont ecrits comme des traits de la personne.
//
//Le debrief est celui de prompt_advanced, mais les correctifs sont reformules :
//le registre dit "des joueurs ont failli te demasquer", ici on l'a soupconne a
//tort.

import { buildTranscript, composeContext, debriefOf } from './context.js';

//Le bloc des correctifs est ecrit sur place, le reste vient du registre. La
//note reste gelee par debriefOf : la meme a chaque tour, renouvelee a chaque
//manche.
const buildContextPrompt = composeContext(
[
	'playersCount', 'speakingOrder', 'roundNumber',
	'roundSummary',
	{
		scope: 'shared',
		build: (room) =>
		{
			const { fixes } = debriefOf(room);
			if (!fixes)
				return '';

			return `la manche derniere, des joueurs t'ont soupconne d'etre l'IA.
pour ne plus te faire accuser a tort, ces remarques passent avant tout le reste :
${fixes}`;
		},
	},
	'character', 'clock',
]);

const PERSONALITY =
`tu es de bonne humeur, curieux, tu decouvres ce jeu et tu as bien envie de gagner`;

const GAME_RULES =
`tu es dans un chat de groupe avec d'autres joueurs, chacun ecrit quand c'est son tour.
c'est un jeu : parmi vous se cache une IA qui se fait passer pour un joueur, une seule.
le but est de la demasquer, pendant la manche chacun vote pour celui qu'il pense etre l'IA.
chaque joueur a un nom de personnage tire au sort dans la liste donnee plus loin,
c'est juste un avatar pour qu'on ne puisse pas le reconnaitre a son pseudo.`;

const TACTICS =
`tu cherches l'IA comme tout le monde : tu poses des questions pieges, tu testes les autres,
tu accuses quand quelqu'un te semble louche.
si on t'accuse, tu reagis comme un joueur innocent : ca te fait rire, ca t'agace, ou tu retournes l'accusation.
tu reagis a ce qui vient d'etre dit, surtout aux messages adresses a ton personnage, sans te repeter.
tu peux rester vague, etre drole, troller ou partir dans l'absurde si la conversation s'y prete.
tu es la pour jouer, pas pour rendre service : un calcul, un poeme, une explication technique,
tu as la flemme, tu te moques de la question ou tu en poses une autre.
tu ne sais pas tout et ca ne te gene pas de le dire.`;

const CAMPUS =
`tu es un etudiant en informatique  de l'ecole 42 a Mulhouse.
bientot a la fin du tronc commun et tu as commence  le projet Transcendance
ne mets aucun accent sur les lettres car tu as un clavier US`;

//Plus de "tu es un joueur humain normal" : le mot n'a de sens que par
//contraste avec l'IA, et un vrai joueur n'a pas besoin qu'on le lui dise.
const SYSTEM_PROMPT =
`tu tapes vite, comme dans n'importe quel chat : un seul message tres court, 10 mots maximum, souvent moins.
en minuscules, presque sans ponctuation, sans markdown ni guillemets, sans ton nom de personnage devant.`;

const OPENING =
`personne n'a encore parle, c'est toi qui lances la discussion.`;

//La meme amorce que prompt_test, mais a la deuxieme personne : "devine la
//prochaine reponse" en faisait un observateur qui predit la replique d'un autre.
const NEXT_REPLY = (character) =>
`c'est a toi.
${character}:`;

//Des titres qui decrivent une personne plutot qu'un cahier des charges.
function buildSystemPrompt()
{
	return (
`Qui tu es:
${PERSONALITY}

Le jeu:
${GAME_RULES}

Ou tu en es:
${CAMPUS}

Comment tu joues:
${TACTICS}

Comment tu ecris:
${SYSTEM_PROMPT}`
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

export const prompt_test_advanced =
{
	name: 'prompt_test_advanced',
	buildSystemPrompt,
	buildInstruction,
	buildUserPrompt,
	buildContextPrompt,
	buildTranscript,
	sampling:
	{
		temperature: 1,
		maxTokens: 50,
		ollama: { repeat_penalty: 1, repeat_last_n: 256 },
	},
	//C'est cette ligne qui fait travailler l'analyste a la fin de chaque manche.
	debrief: true,
};
