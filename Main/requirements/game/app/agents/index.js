//Liste les differents agents disponibles

import { mistralAgent } from './mistral_medium.js';

const DEFAULT_AGENT='mistral_medium'

const agents =
{
	mistral: mistralAgent,
};

function getAgent(name)
{
	return agents[name] ?? null;
}
export async function generateReply(history, agentName = `${DEFAULT_AGENT}`, additionalContext = '')
{
	const agent = getAgent(agentName);
	if (!agent)
		throw new Error('unknown_agent');

	return agent.generate(history, additionalContext);
}
