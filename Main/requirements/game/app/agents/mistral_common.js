//Tout ce que les agents Mistral partagent : endpoint, cle, prompt, appel, logs.
//Les fichiers mistral_*.js ne declarent plus que leur nom et leur modele.

import { buildSystemPrompt, buildUserPrompt } from './prompt.js';

const MISTRAL_API_URL = 'https://api.mistral.ai/v1';
const apiKey = process.env.MISTRAL_API_KEY;
const SYSTEM_PROMPT = buildSystemPrompt();

const HEALTHCHECK_TIMEOUT_MS = 5000;
const TEMPERATURE = 0.85;
const MAX_TOKENS = 70;

//Fabrique un agent conforme au contrat { name, generate, healthCheck }.
export function createMistralAgent({ name, model })
{
	return {
		name,

		async healthCheck()
		{
			return checkMistralModel(model);
		},

		async generate(history, additionalContext = {})
		{
			return ask(model, buildMessages(history, additionalContext));
		},
	};
}

//Le contexte arrive en deux morceaux parce que l'agent local en a besoin pour
//son KV cache (voir ollama_local.js). Ici rien a optimiser : on recolle.
function buildMessages(history, { shared = '', perBot = '' })
{
	const additionalContext = [shared, perBot].filter(Boolean).join('\n');

	return [
		{ role: 'system', content: `${SYSTEM_PROMPT}\n${additionalContext}` },
		{ role: 'user', content: buildUserPrompt(history) },
	];
}

async function ask(model, messages)
{
	const response = await fetch(`${MISTRAL_API_URL}/chat/completions`,
	{
		method: 'POST',
		headers:
		{
			'Authorization': `Bearer ${apiKey}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(
		{
			model,
			messages,
			temperature: TEMPERATURE,
			max_tokens: MAX_TOKENS,
		}),
	});

	if (!response.ok)
	{
		logMistralError(model, response, await response.text());
		return null;
	}

	const data = await response.json();
	return data.choices?.[0]?.message?.content?.trim() ?? null;
}

//Le modele concerne, le status, le corps. Sur 429, les entetes de quota
//disent si la limite vient de nous ou du pool partage du palier.
function logMistralError(model, response, body)
{
	console.error(`[${model}] HTTP ${response.status} :`, body);

	const limits = [];
	for (const [key, value] of response.headers)
	{
		const k = key.toLowerCase();
		if (k.includes('ratelimit') || k === 'retry-after')
			limits.push(`${key}=${value}`);
	}
	if (limits.length)
		console.error(`[${model}] quotas :`, limits.join('  '));
}

//Liste les modeles autorises par la cle : aucun token consomme, ne throw jamais.
async function checkMistralModel(model)
{
	if (!apiKey)
		return { ok: false, detail: 'MISTRAL_API_KEY absente' };

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), HEALTHCHECK_TIMEOUT_MS);

	try
	{
		const res = await fetch(`${MISTRAL_API_URL}/models`,
		{
			headers: { 'Authorization': `Bearer ${apiKey}` },
			signal: controller.signal,
		});

		if (!res.ok)
			return { ok: false, detail: `HTTP ${res.status} sur /v1/models` };

		const data = await res.json();
		const found = (data.data ?? []).some((m) => m.id === model);
		if (!found)
			return { ok: false, detail: `modele ${model} indisponible sur cette cle` };

		return { ok: true, detail: `${model} disponible` };
	}
	catch (err)
	{
		if (err.name === 'AbortError')
			return { ok: false, detail: `timeout apres ${HEALTHCHECK_TIMEOUT_MS} ms` };
		return { ok: false, detail: `API injoignable : ${err.message}` };
	}
	finally
	{
		clearTimeout(timer);
	}
}

//Les agents disponibles : seuls le nom et le modele changent.
//Le nom de l'export est identique au champ name, qui sert de cle dans le
//registre d'agents et dans gameConfig.bots : un seul nom a retenir, et une
//faute de frappe devient une erreur d'import au lieu d'un agent introuvable
//au milieu d'une partie.
export const mistral_medium = createMistralAgent(
{
	name: 'mistral_medium',
	model: 'mistral-medium-3.5',
});

export const mistral_big = createMistralAgent(
{
	name: 'mistral_big',
	model: 'mistral-large-latest',
});

export const mistral_small = createMistralAgent(
{
	name: 'mistral_small',
	model: 'mistral-small-latest',
});
