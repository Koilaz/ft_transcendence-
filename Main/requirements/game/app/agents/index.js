//Liste les differents agents disponibles

import { gameConfig } from '../game/config.js';
import { mistral_medium, mistral_big, mistral_small, ministral_14b } from './mistral_common.js';
import { mistral_7B_local } from './ollama_local.js';

const DEFAULT_AGENT='mistral_medium'

const agents =
{
	[mistral_medium.name]: mistral_medium,
	[mistral_big.name]: mistral_big,
	[mistral_small.name]: mistral_small,
	[ministral_14b.name]: ministral_14b,
	[mistral_7B_local.name]: mistral_7B_local,
};

//Les cles du registre, c'est-a-dire les seules valeurs acceptees dans
//gameConfig.bots. Sert aussi a construire les messages d'erreur.
export function availableAgents()
{
	return Object.keys(agents);
}

function getAgent(name)
{
	return agents[name] ?? null;
}
export async function generateReply(history, agentName = `${DEFAULT_AGENT}`, additionalContext = {})
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

	return agent.generate(history, additionalContext);
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

//Les agents nommes dans gameConfig.bots qui ne joueront pas. Un nom absent du
//registre et un agent dont l'API refuse de repondre donnent exactement la meme
//partie — une partie sans imposteur — donc la meme liste, celle que le front
//recoit pour prevenir le joueur.
export function unavailableBots(bots = gameConfig.bots, report = healthReport)
{
	const seen = new Set();
	const broken = [];

	for (const name of bots)
	{
		if (seen.has(name))
			continue;
		seen.add(name);

		if (!agents[name])
		{
			broken.push({ name, reason: 'unknown_agent',
				detail: `absent du registre — agents disponibles : ${availableAgents().join(', ')}` });
			continue;
		}

		const health = report.get(name);
		if (health && !health.ok)
			broken.push({ name, reason: health.reason, detail: health.detail });
	}

	return broken;
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
