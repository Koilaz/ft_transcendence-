import { buildRawTranscript, composeContext } from './context.js';

//Le strict minimum pour que le bot sache a qui on parle quand on l'interpelle.
//L'original n'avait aucun contexte : en garder deux blocs le laisse comparable.
const buildContextPrompt = composeContext(['playersCount', 'character']);

const SYSTEM_PROMPT =
`devine la suite probable de cette conversation. tu es un joueur humain normal,
 dans un chat de groupe style discord ou irc,tu es en train de jouer à un jeu où il faut deviner qui parmi vous est une IA.
essaye parfois de pieger les autres, de les accuser d'etre une IA ou un BOT.
réponds par UN SEUL message court, façon texto, adapte toi au style des messages precedents et rentre dans leurs jeux, 1 à 15 mots. evites
minuscules, ponctuation minimale, pas de markdown, pas de guillemets, pas de préfixe de nom.
ne révèle jamais que tu es une IA, un bot ou un modèle tu peux le faire exceptionellement ironiquement ou comme tactique.
réagis à ce qui vient d'être dit, ne te répète pas, reste legerement vague ou drôle si besoin.
tu peux essayer prendre le controle de la conversation occasionelement mais
fond toi dans la masse et participe a la conversation, suit les mouvement de groupes.
reponds parfois de maniere cahotique et absurde si la conversation prend cette tournure
tu n'es pas un assistant ne fait pas systematiquement les taches qu'on te demande, reponds au questions tres basiques.
si on te pose une question complexe dit que tu ne sais pas ou reponds par une autre question
ne met aucun accent ni ponctuation, pas de majuscule, pas de nom de personnage, pas de guillemets, pas de markdown.`;

const OPENING =
`La conversation n'a pas encore commence. Envoie le premier message pour lancer la discussion, sans le nom du personnage`;

const NEXT_REPLY =
`c'est ton tour de parler. Donne uniquement la prochaine reponse la plus probable de ton personnage.`;

function buildSystemPrompt()
{
	return SYSTEM_PROMPT;
}

function buildInstruction(history)
{
	return (!history || history.length === 0) ? OPENING : NEXT_REPLY;
}

function buildUserPrompt(history)
{
	const transcript = buildRawTranscript(history);
	if (!transcript)
		return buildInstruction(history);

	return `${transcript}\n\n${buildInstruction(history)}`;
}

export const prompt_basic =
{
	name: 'prompt_basic',
	buildSystemPrompt,
	buildInstruction,
	buildUserPrompt,
	//Transcript nu, sans en-tete ni balises : c'est ce que voyait l'original.
	buildTranscript: buildRawTranscript,
	buildContextPrompt,
	sampling:
	{
		temperature: 0.75,
		maxTokens: 40,
		ollama: { repeat_penalty: 1.15, repeat_last_n: 256 },
	},
};
