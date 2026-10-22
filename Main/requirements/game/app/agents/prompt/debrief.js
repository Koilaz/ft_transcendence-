//L'analyse d'apres-manche : un gros modele relit la manche qui vient de finir
//et les votes, puis ecrit la note que le bot lira a la manche suivante. C'est
//le seul endroit du code ou un modele ecrit du prompt pour un autre modele.

import { getAgent, availableAgents } from '../index_agent.js';
import { buildRawTranscript } from './context.js';
import { getPrompt } from './index_prompt.js';

const DEBRIEF_AGENT = 'mistral_big';

//Le modele lit une partie a laquelle il n'a pas joue : il lui faut les regles
//avant les faits, sinon il commente la conversation au lieu d'analyser le
//bluff.
const ANALYSIS_SYSTEM =
`tu es l'analyste d'une IA qui joue a un jeu de bluff dans un chat de groupe.
un modele de langage s'y fait passer pour un joueur humain, les autres joueurs
sont de vrais humains. pendant la manche tout le monde vote pour
designer l'IA, et les personnages sont retires au sort pour la manche suivante.
on te donne la manche qui vient de finir : la conversation, le personnage que
portait l'IA, et les votes.
ton travail est d'ecrire la note que l'IA lira avant la manche suivante.
tu ne parles pas a l'IA de son score, tu lui dis quoi changer.`;

const ANALYSIS_RULES =
`consignes de redaction :
- vise ce qui a trahit reellement une IA dans un chat.

- si une tactique humaine a fonctionne (une question piege, un test, une
  accusation frontale), dis comment y repondre la prochaine fois.
- dans le resume comme dans les correctifs, ne designe jamais le joueur
  conseille comme l'IA, un bot ou un modele : parle-lui a la deuxieme personne,
  comme a un joueur que les autres ont soupconne.
- chaque consigne tient sur une ligne de quinze mots maximum.

reponds exactement dans ce format, sans rien avant ni apres :
<resume>
quatre phrases maximum : de quoi on a parle, quel ton avait la conversation,
quels soupcons pesent et sur quel genre de comportement, et une phrase sur
la facon dont la conversation s'est terminee (dernier sujet, dernier echange).
</resume>
<correctifs>
une ou deux consignes pour eviter les comportements qui ont trahis L'IA a la manche precedente
</correctifs>`;


export function requestDebrief(room, results)
{
	if (!wantsDebrief(room))
		return;
	const analyst = getAgent(DEBRIEF_AGENT);
	if (!analyst)
	{
		console.error(`[debrief] agent "${DEBRIEF_AGENT}" absent du registre — analyse ignoree.`
			+ ` Corrige DEBRIEF_AGENT dans prompt/debrief.js.`
			+ ` Agents disponibles : ${availableAgents().join(', ')}`);
		return;
	}

	room.debriefPending = true;
	askAnalyst(analyst, room, results)
		.then((text) =>
		{
			//Une analyse vide ou ratee garde la note precedente : perdre la
			//memoire accumulee serait pire que de ne pas l'avoir mise a jour.
			const debrief = parseDebrief(text);
			logDebrief(room, debrief, text);
			room.debrief = debrief ?? room.debrief;
		})
		.catch((err) => console.error(`[debrief] room ${room.id} : analyse echouee :`, err.message))
		.finally(() => { room.debriefPending = false; });
}

function wantsDebrief(room)
{
	return [...room.players.values()].some((p) => getPrompt(room.nextRoundPromptOf(p))?.debrief);
}

//On reutilise l'agent tel quel — logs, entetes de quota, gestion d'erreur
//comprises — en lui passant un objet qui remplit le sous-ensemble du contrat de
//prompt que les agents consomment reellement.
//maxTokens est indispensable : le defaut de l'agent est 70 tokens, taille d'un
//message de joueur, pas d'une note d'analyse.
//async : ce qui casse ici doit repartir en promesse rejetee, que requestDebrief
//rattrape. Une exception synchrone remonterait jusqu'au chrono de la manche et
//emporterait le serveur, pour une note dont personne ne depend.
async function askAnalyst(analyst, room, results)
{
	const body = buildAnalysisPrompt(room, results);

	return analyst.generate(null, {},
	{
		name: 'debrief',
		buildSystemPrompt: () => ANALYSIS_SYSTEM,
		buildUserPrompt: () => body,
		sampling: { temperature: 0.4, maxTokens: 600 },
	});
}

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
//Une section absente donne une chaine vide, que composeContext saute deja. Les
//deux absentes, la reponse est illisible : null, et la note precedente reste.
function parseDebrief(text)
{
	if (!text)
		return null;

	const debrief =
	{
		summary: section(text, 'resume'),
		fixes: section(text, 'correctifs'),
	};
	return (debrief.summary || debrief.fixes) ? debrief : null;
}

//mistral ouvre ses balises mais ne les ferme presque jamais : une section
//s'arrete a sa balise fermante, a la balise ouvrante suivante ou a la fin.
function section(text, tag)
{
	return text.match(new RegExp(`<${tag}>([\\s\\S]*?)(?:</${tag}>|(?=<\\w+>)|$)`))?.[1].trim() ?? '';
}

//#TMP a supprimer : la note produite par l'analyste. C'est la seule facon de
//voir ce que le bot recevra a la manche suivante — le prompt envoye est deja
//loggue par mistral_common, la reponse ne l'est pas.
function logDebrief(room, debrief, text)
{
	console.log(`----- [debrief] room ${room.id} apres la manche ${room.roundNumber} -----`);
	if (!debrief)
		console.log(`--- reponse illisible, note precedente gardee ---\n${text || '(vide)'}`);
	else
	{
		console.log(`--- resume ---\n${debrief.summary || '(vide)'}`);
		console.log(`--- correctifs ---\n${debrief.fixes || '(vide)'}`);
	}
	console.log('--------------------------------------------------');
}
