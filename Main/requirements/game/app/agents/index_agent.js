//Liste les differents agents disponibles

import { gameConfig, botEntries, DEFAULT_PROMPT } from '../game/config.js';
import { availablePrompts, getPrompt, requirePrompt } from './prompt/index_prompt.js';
import { mistral_medium, mistral_big, mistral_small, ministral_14b } from './mistral_common.js';
import { local_agent } from './ollama_local.js';

const DEFAULT_AGENT='mistral_medium'

const agents =
{
	[mistral_medium.name]: mistral_medium,
	[mistral_big.name]: mistral_big,
	[mistral_small.name]: mistral_small,
	[ministral_14b.name]: ministral_14b,
	[local_agent.name]: local_agent,
};

//Les cles du registre, c'est-a-dire les seules valeurs acceptees dans le champ
//`agent` de gameConfig.bots. Sert aussi a construire les messages d'erreur.
export function availableAgents()
{
	return Object.keys(agents);
}

//null si le nom est inconnu : l'appelant decide si c'est fatal (une partie qui
//demarre) ou si ca se contourne (l'analyse d'apres-manche, qui se passe du sien).
export function getAgent(name)
{
	return agents[name] ?? null;
}

//Le prompt arrive par son nom, comme l'agent : les deux se lisent dans
//gameConfig.bots et nulle part ailleurs. C'est ici qu'ils se rejoignent, et
//l'agent recoit un prompt deja resolu — il ne sait pas lequel, il ne fait que
//lui demander son texte.
export async function generateReply(history, agentName = `${DEFAULT_AGENT}`, additionalContext = {}, promptName = DEFAULT_PROMPT)
{
	const agent = getAgent(agentName);
	if (!agent)
	{
		//fatal : un nom d'agent absent du registre ne se repare pas tout seul,
		//inutile de laisser le bot retenter deux fois avant d'abandonner.
		const err = new Error(`unknown_agent "${agentName}"`
			+ ` — corrige bots dans game/config.js.`
			+ ` Agents disponibles : ${availableAgents().join(', ')}`);
		err.fatal = true;
		throw err;
	}

	//Meme traitement pour un nom de prompt inconnu (requirePrompt jette fatal).
	return agent.generate(history, additionalContext, requirePrompt(promptName));
}

//Previent l'agent que sa manche commence, avec le contexte qui vaudra pour
//toute sa duree. Un agent libre de faire ce qu'il veut de l'information :
//l'agent local en profite pour remplir son cache, les agents distants n'ont rien
//a precharger et ne definissent pas la methode.
//Ne rend jamais la main sur une erreur : un prechauffage rate coute des
//secondes au premier tour, pas la manche.
export function preheatAgent(agentName, promptName, additionalContext = {})
{
	const agent = getAgent(agentName);
	const prompt = getPrompt(promptName);
	if (!agent?.preheat || !prompt)
		return;

	agent.preheat(additionalContext, prompt)
		.catch((err) => console.error(`[${agentName}] prechauffage echoue :`, err.message));
}

//Le rapport de sante est ce qu'il y a de plus critique au demarrage : sans bot
//jouable, la file refuse de lancer la moindre partie. Il doit donc se retrouver
//d'un coup d'oeil au milieu des logs de docker compose, d'ou les couleurs.
//NO_COLOR est la convention des outils en ligne de commande. On ne teste pas
//isTTY : la sortie d'un conteneur n'en est jamais un, ce qui eteindrait les
//couleurs precisement la ou elles servent.
const paint = (code) => (text) => (process.env.NO_COLOR ? text : `\x1b[${code}m${text}\x1b[0m`);
const green = paint('1;32');
const red = paint('1;31');
const bold = paint('1');

//Dernier rapport de sante, garde pour la duree du processus : le healthCheck
//tourne une fois au demarrage, mais la question « les bots vont-ils parler ? »
//se pose a chaque joueur qui se connecte.
let healthReport = new Map(); // name -> { ok, reason, detail }

const BOOT_ATTEMPTS = 10;   // un essai par seconde

//Les conteneurs demarrent ensemble : ollama n'ecoute souvent pas encore quand
//game fait son premier essai. Seule l'absence de reponse merite d'insister,
//un refus (cle, quota, modele absent) ne changera pas en quelques secondes.
async function checkUntilReachable(agent)
{
	for (let attempt = 1; ; attempt++)
	{
		const result = await agent.healthCheck();
		if (result.reason !== 'unreachable' || attempt === BOOT_ATTEMPTS)
			return result;
		await new Promise((resolve) => setTimeout(resolve, 1000));
	}
}

export async function checkAllAgents()
{
	const checkable = Object.values(agents).filter((a) => a.healthCheck);

	//Le titre avant l'attente : les agents logguent les modeles qu'ils voient
	//pendant leur healthCheck, autant que ces lignes tombent dans le bloc.
	console.log(bold('\n========== Etat des agents =========='));
	const results = await Promise.all(
		checkable.map(async (a) => ({ name: a.name, ...(await checkUntilReachable(a)) }))
	);
	healthReport = new Map(results.map((r) => [r.name, r]));

	for (const { name, ok, detail } of results)
		console.log(`  ${ok ? green('[ OK ]') : red('[ KO ]')} ${name} — ${detail}`);
	logUnavailableBots();
	logVerdict();
	console.log(bold('====================================\n'));

	return healthReport;
}

//Les agents que le healthCheck a vus repondre. C'est la seule liste utile a
//qui doit corriger gameConfig.bots : lui proposer un nom du registre qui ne
//repond pas le ferait tourner en rond.
export function healthyAgents(report = healthReport)
{
	return [...report.values()].filter((r) => r.ok).map((r) => r.name);
}

//Trie gameConfig.bots en deux : ceux qui joueront, ceux qui ne joueront pas et
//pourquoi. Un seul parcours pour les deux listes, sinon la file et le rapport
//d'erreur repondent un jour deux choses differentes.
//Trois pannes, un seul effet — une partie sans imposteur : un agent absent du
//registre, un agent dont l'API refuse de repondre, et un prompt absent du
//registre. Elles remontent donc dans la meme liste, celle que le front recoit
//pour prevenir le joueur.
function splitBots(bots = gameConfig.bots, report = healthReport)
{
	const seen = new Set();
	const broken = [];
	const usable = [];

	//Le meme agent ou le meme prompt casse peut equiper plusieurs bots : on ne
	//le signale qu'une fois, il n'y a qu'une chose a reparer.
	const signal = (key, entry) =>
	{
		if (seen.has(key))
			return;
		seen.add(key);
		broken.push(entry);
	};

	const isUsable = ({ agent, prompt }) =>
	{
		let ok = true;

		//Les deux verifications sont independantes : un bot mal configure des
		//deux cotes doit voir ses deux erreurs, pas la premiere puis l'autre au
		//redemarrage suivant.
		if (!agents[agent])
		{
			ok = false;
			const healthy = healthyAgents(report);
			signal(`agent:${agent}`, { name: agent, agent, prompt, reason: 'unknown_agent',
				detail: `absent du registre — agents operationnels : ${healthy.length ? healthy.join(', ') : 'aucun'}` });
		}
		else
		{
			const health = report.get(agent);
			if (health && !health.ok)
			{
				ok = false;
				signal(`agent:${agent}`, { name: agent, agent, prompt, reason: health.reason, detail: health.detail });
			}
		}

		if (!getPrompt(prompt))
		{
			ok = false;
			signal(`prompt:${prompt}`, { name: prompt, agent, prompt, reason: 'unknown_prompt',
				detail: `prompt du bot ${agent} absent du registre — prompts disponibles : ${availablePrompts().join(', ')}` });
		}

		return ok;
	};

	//Une manche dont le bot est casse est retiree de la liste, les suivantes
	//avancent d'un cran : la partie se joue quand meme. Le bot n'est ecarte que
	//si aucune de ses manches n'est jouable. filter verifie chaque manche, meme
	//apres une erreur, pour que toutes soient signalees.
	for (const rounds of botEntries(bots))
	{
		const playable = rounds.filter(isUsable);
		if (playable.length)
			usable.push(playable);
	}

	return { usable, broken };
}

//Les bots de gameConfig.bots qui ne joueront pas, et pourquoi.
export function unavailableBots(bots = gameConfig.bots, report = healthReport)
{
	return splitBots(bots, report).broken;
}

//Les bots reellement exploitables, sous leur forme complete : pour chacun, la
//liste de ses { agent, prompt } par manche. C'est cette liste que la file
//injecte dans la room : elle ne contient que des manches dont l'agent repond et
//dont le prompt existe.
export function usableBots(bots = gameConfig.bots, report = healthReport)
{
	return splitBots(bots, report).usable;
}

//Sans cette ligne, un bot inconnu ou une cle sans quota ne se voient qu'au
//premier tour de jeu, sous la forme d'un bot muet.
//console.log et non console.error : docker melange les deux flux a l'arrivee, et
//ces lignes tombaient hors du bloc, apres son trait de fermeture.
function logUnavailableBots()
{
	const broken = unavailableBots();
	if (!broken.length)
		return;

	console.log(red(`  [ KO ] game/config.js — bots indisponibles :`));
	for (const { name, detail } of broken)
		console.log(red(`         ${name} — ${detail}`));
}

//Le chiffre a lire au demarrage : sans bot jouable, la file garde les joueurs
//en attente plutot que de lancer une partie sans imposteur (voir game/queue.js).
//Les manches perdues se comptent a part — la partie se joue, mais pas avec la
//difficulte prevue (voir gameConfig.bots).
function logVerdict()
{
	//On compte les bots tels qu'ils s'ecrivent dans la config, manche par
	//manche : c'est ce que relit celui qui cherche ce qui manque. Un bot qui
	//change d'agent a chaque manche en pese donc autant que de manches.
	const prevus = botEntries().flat().length;
	if (!prevus)
		return console.log(bold('  aucun bot configure — les parties se joueront sans imposteur'));

	const usable = usableBots();
	if (!usable.length)
		return console.log(red('  AUCUN BOT JOUABLE — aucune partie ne demarrera'));

	const jouables = usable.flat().length;
	if (jouables === prevus)
		return console.log(green('  tous les bots de game/config.js sont disponibles'));

	//Le bot d'une manche hors service est retire de la liste de son bot (voir
	//splitBots) : la partie se joue, mais pas avec la progression prevue.
	console.log(red(`  ${prevus - jouables} bot(s) sur ${prevus} indisponible(s) :`
		+ ` la difficulte jouee ne sera pas celle prevue`));
}
