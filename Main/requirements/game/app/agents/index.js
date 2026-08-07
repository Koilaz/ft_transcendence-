//Liste les differents agents disponibles

import { mistralAgent, mistralBigAgent, mistralSmallAgent } from './mistral_common.js';
import { mistral_7B_local } from './ollama_local.js';

const DEFAULT_AGENT='mistral_medium'

const agents =
{
	[mistralAgent.name]: mistralAgent,
	[mistralBigAgent.name]: mistralBigAgent,
	[mistralSmallAgent.name]: mistralSmallAgent,
	[mistral_7B_local.name]: mistral_7B_local,
};

function getAgent(name)
{
	return agents[name] ?? null;
}
export async function generateReply(history, agentName = `${DEFAULT_AGENT}`, additionalContext = {})
{
	const agent = getAgent(agentName);
	if (!agent)
		throw new Error('unknown_agent');

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
	console.log('-----------------------');

	return results;
}
