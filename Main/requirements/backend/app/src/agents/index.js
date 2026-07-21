//Liste les differents agents disponibles

import { mistralAgent } from './mistral.js';

const DEFAULT_AGENT='mistral'

const agents =
{
	mistral: mistralAgent,
};

function getAgent(name)
{
	return agents[name] ?? null;
}
export async function generateReply(history, agentName = `${DEFAULT_AGENT}`)
{
	const agent = getAgent(agentName);
	if (!agent)
		throw new Error('unknown_agent');

	return agent.generate(history);
}
