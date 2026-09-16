//L'analyse d'apres-manche : un gros modele relit la manche qui vient de finir
//et les votes, puis ecrit la note que le bot lira a la manche suivante. C'est
//le seul endroit du code ou un modele ecrit du prompt pour un autre modele.
//
//Deux choses en sortent, et elles ne servent pas a la meme chose :
//  resume      la memoire du bot entre les manches. room.history est videe a
//              chaque manche (voir game/room.js), c'est donc tout ce qu'il
//              garde de la precedente — pour quelques dizaines de tokens la ou
//              le transcript complet en couterait des centaines.
//  correctifs  ce qui l'a trahi, dit a l'imperatif. Sans ca, une tactique
//              humaine qui a marche a la manche 1 remarche a la manche 2.
//
//L'appel ne bloque personne : il part a la fin de la manche, la room lui laisse
//la transition pour repondre, et ce qui arrive trop tard est ignore par la
//manche en cours (voir le gel dans prompt/context.js).

import { mistral_big } from '../mistral_common.js';
import { buildRawTranscript } from './context.js';
import { getPrompt } from './index_prompt.js';

//Le modele lit une partie a laquelle il n'a pas joue : il lui faut les regles
//avant les faits, sinon il commente la conversation au lieu d'analyser le
//bluff.
const ANALYSIS_SYSTEM =
`tu es l'analyste d'une IA qui joue a un jeu de bluff dans un chat de groupe.
un modele de langage s'y fait passer pour un joueur humain, les autres joueurs
sont de vrais humains. a la fin de chaque manche tout le monde vote pour
designer l'IA, et les personnages sont retires au sort pour la manche suivante.
on te donne la manche qui vient de finir : la conversation, le personnage que
portait l'IA, et les votes.
ton travail est d'ecrire la note que l'IA lira avant la manche suivante.
tu ne parles pas a l'IA de son score, tu lui dis quoi changer.`;

//Les consignes de redaction. Les deux premieres sont celles qui rendent la note
//utilisable, le reste n'est que du cadrage :
//  - les personnages changent a chaque manche, une note qui en cite un est au
//    mieux inutile, au pire elle fait accuser un innocent ;
//  - la note precedente est reecrite et non recopiee, c'est ce qui rend le
//    debrief cumulatif sans qu'il grossisse d'une manche a l'autre.
const ANALYSIS_RULES =
`consignes de redaction :
- ne cite jamais un nom de personnage dans ta reponse. ils sont retires au sort
  a chaque manche et ne designeront plus les memes joueurs. parle des joueurs
  par leur comportement ou leur facon d'ecrire.
- s'il y a une note precedente, reecris-la en y integrant cette manche au lieu
  de la repeter : la note doit rester de la meme taille de manche en manche.
- vise ce qui trahit reellement une IA dans un chat : longueur des messages,
  ponctuation et majuscules trop propres, vocabulaire trop soutenu, reponses
  trop serviables, temps de reaction, refus de repondre a une question piege,
  incapacite a rebondir sur une blague ou une reference locale.
- si une tactique humaine a fonctionne (une question piege, un test, une
  accusation frontale), dis comment y repondre la prochaine fois.

reponds exactement dans ce format, sans rien avant ni apres :
<resume>
trois phrases maximum : de quoi on a parle, quel ton avait la conversation,
quels soupcons pesent et sur quel genre de comportement.
</resume>
<correctifs>
- trois a cinq consignes imperatives, concretes, une par ligne, adressees a l'IA
</correctifs>`;

//Le declencheur, appele par Room.handleRoundEnd. Ne rend jamais la main sur une
//erreur et ne s'attend pas : une analyse ratee coute les correctifs d'une
//manche, pas la manche. Meme philosophie que preheatAgent (agents/index_agent.js).
export function requestDebrief(room, results)
{
	if (!wantsDebrief(room))
		return;

	room.debriefPending = true;
	askAnalyst(room, results)
		.then((text) =>
		{
			//Une analyse vide ou ratee garde la note precedente : perdre la
			//memoire accumulee serait pire que de ne pas l'avoir mise a jour.
			room.debrief = parseDebrief(text) ?? room.debrief;
			logDebrief(room);
		})
		.catch((err) => console.error(`[debrief] room ${room.id} : analyse echouee :`, err.message))
		.finally(() => { room.debriefPending = false; });
}

//Sans cette question, toutes les rooms paieraient l'appel et prolongeraient
//leur transition pour attendre une note que personne ne lit. Un prompt declare
//`debrief: true` quand il consomme les blocs roundSummary/corrections.
//getPrompt(null) rend null pour les humains, il n'y a rien a filtrer de plus.
function wantsDebrief(room)
{
	return [...room.players.values()].some((p) => getPrompt(p.promptName)?.debrief);
}

//On reutilise l'agent mistral tel quel — logs, entetes de quota, gestion
//d'erreur comprises — en lui passant un objet qui remplit le sous-ensemble du
//contrat de prompt que createMistralAgent consomme reellement.
//maxTokens est indispensable : le defaut de l'agent est 70 tokens, taille d'un
//message de joueur, pas d'une note d'analyse.
function askAnalyst(room, results)
{
	const body = buildAnalysisPrompt(room, results);

	return mistral_big.generate(null, {},
	{
		name: 'debrief',
		buildSystemPrompt: () => ANALYSIS_SYSTEM,
		buildUserPrompt: () => body,
		sampling: { temperature: 0.4, maxTokens: 400 },
	});
}

//Les faits, puis la conversation, puis la note precedente, puis les consignes.
//Les balises marquent de la donnee et non des consignes : ce qui est dedans a
//ete ecrit par les joueurs, l'analyste l'observe et n'y obeit pas.
function buildAnalysisPrompt(room, results)
{
	const parts =
	[
		buildFacts(room, results),
		`<conversation>\n${buildRawTranscript(room.history)}\n</conversation>`,
		buildPreviousNote(room),
		ANALYSIS_RULES,
	];

	return parts.filter(Boolean).join('\n\n');
}

//Le personnage de l'IA et le detail des votes. C'est la seule chose que la
//conversation ne dit pas et sans laquelle l'analyse n'a pas d'objet : qui a
//devine, et qui les autres ont accuse a la place.
//Les personnages sont nommes ici, contrairement a la reponse attendue : c'est
//ce qui permet de recouper un vote avec les repliques de son auteur dans le
//transcript.
function buildFacts(room, results)
{
	const ai = results.find((r) => r.isAI);
	const humans = results.filter((r) => !r.isAI);
	const found = humans.filter((r) => r.isCorrect).length;

	const votes = humans
		.map((r) => `  - "${r.character}" ${r.target ? `a accuse "${r.target}"` : `n'a pas vote`}`)
		.join('\n');

	return `manche ${room.roundNumber} — l'IA portait le personnage "${ai.character}".
${found} joueur(s) sur ${humans.length} l'ont trouvee.
${votes}`;
}

function buildPreviousNote(room)
{
	if (!room.debrief)
		return '';

	const { summary, fixes } = room.debrief;
	return `<note_precedente>\n${[summary, fixes].filter(Boolean).join('\n')}\n</note_precedente>`;
}

//Deux sections balisees plutot qu'un bloc libre : chacune part dans un bloc de
//contexte different, et un prompt peut prendre les correctifs sans le resume.
//Une section absente donne une chaine vide, que composeContext saute deja.
function parseDebrief(text)
{
	if (!text)
		return null;

	return {
		summary: section(text, 'resume'),
		fixes: section(text, 'correctifs'),
	};
}

function section(text, tag)
{
	return text.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))?.[1].trim() ?? '';
}

//#TMP a supprimer : la note produite par l'analyste. C'est la seule facon de
//voir ce que le bot recevra a la manche suivante — le prompt envoye est deja
//loggue par mistral_common, la reponse ne l'est pas.
function logDebrief(room)
{
	console.log(`----- [debrief] room ${room.id} apres la manche ${room.roundNumber} -----`);
	console.log(`--- resume ---\n${room.debrief.summary || '(vide)'}`);
	console.log(`--- correctifs ---\n${room.debrief.fixes || '(vide)'}`);
	console.log('--------------------------------------------------');
}
