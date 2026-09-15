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

function getAgent(name)
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

//Dernier rapport de sante, garde pour la duree du processus : le healthCheck
//tourne une fois au demarrage, mais la question « les bots vont-ils parler ? »
//se pose a chaque joueur qui se connecte.
let healthReport = new Map(); // name -> { ok, reason, detail }

export async function checkAllAgents()
{
	const checkable = Object.values(agents).filter((a) => a.healthCheck);

	//Le titre avant l'attente : les agents logguent les modeles qu'ils voient
	//pendant leur healthCheck, autant que ces lignes tombent dans le bloc.
	console.log('--- Etat des agents ---');
	const results = await Promise.all(
		checkable.map(async (a) => ({ name: a.name, ...(await a.healthCheck()) }))
	);
	healthReport = new Map(results.map((r) => [r.name, r]));

	for (const { name, ok, detail } of results)
		console.log(`  [${ok ? 'OK' : 'KO'}] ${name} — ${detail}`);
	logUnavailableBots();
	console.log('-----------------------');

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

	for (const { agent, prompt } of botEntries(bots))
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

		if (ok)
			usable.push({ agent, prompt });
	}

	return { usable, broken };
}

//Les bots de gameConfig.bots qui ne joueront pas, et pourquoi.
export function unavailableBots(bots = gameConfig.bots, report = healthReport)
{
	return splitBots(bots, report).broken;
}

//Les bots reellement exploitables, sous leur forme complete { agent, prompt }.
//C'est cette liste que la file injecte dans la room : elle ne contient que des
//bots dont l'agent repond et dont le prompt existe.
export function usableBots(bots = gameConfig.bots, report = healthReport)
{
	return splitBots(bots, report).usable;
}

//Sans cette ligne, un bot inconnu ou une cle sans quota ne se voient qu'au
//premier tour de jeu, sous la forme d'un bot muet.
function logUnavailableBots()
{
	const broken = unavailableBots();
	if (!broken.length)
		return;

	console.error(`  [KO] game/config.js — bots indisponibles :`);
	for (const { name, detail } of broken)
		console.error(`       ${name} — ${detail}`);
}
