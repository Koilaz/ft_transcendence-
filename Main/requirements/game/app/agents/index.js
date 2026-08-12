//Liste les differents agents disponibles

import { gameConfig } from '../game/config.js';
import { mistral_medium, mistral_big, mistral_small } from './mistral_common.js';
import { mistral_7B_local } from './ollama_local.js';

const DEFAULT_AGENT='mistral_medium'

const agents =
{
	[mistral_medium.name]: mistral_medium,
	[mistral_big.name]: mistral_big,
	[mistral_small.name]: mistral_small,
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

export async function checkAllAgents()
{
	const checkable = Object.values(agents).filter((a) => a.healthCheck);

	const results = await Promise.allSettled(
		checkable.map(async (a) => ({ name: a.name, ...(await a.healthCheck()) }))
	);

	console.log('--- Etat des agents ---');
	for (const r of results)
	{
		if (r.status === 'rejected')
		{
			console.error(`  [KO] healthCheck a throw : ${r.reason?.message}`);
			continue;
		}
		const { name, ok, detail } = r.value;
		console.log(`  [${ok ? 'OK' : 'KO'}] ${name} — ${detail}`);
	}
	checkBotsConfig();
	console.log('-----------------------');

	return results;
}

//Le healthCheck ne teste que les agents du registre : il ne voit pas qu'un nom
//ecrit dans gameConfig.bots n'existe pas. Sans ce controle l'erreur ne sort
//qu'au premier tour de jeu, sous la forme d'un bot muet.
function checkBotsConfig()
{
	const unknown = (gameConfig.bots ?? []).filter((name) => !agents[name]);
	if (!unknown.length)
		return;

	console.error(`  [KO] game/config.js — bots inconnus : ${unknown.join(', ')}`);
	console.error(`       agents disponibles : ${availableAgents().join(', ')}`);
}
