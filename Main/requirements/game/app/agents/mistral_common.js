//Tout ce que les agents Mistral partagent : endpoint, cle, prompt, appel, logs.
//Les fichiers mistral_*.js ne declarent plus que leur nom et leur modele.

import { buildSystemPrompt } from './prompt.js';

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

	let userMessage;
	if (!history || history.length === 0)
	{
		userMessage = `La conversation n'a pas encore commence. Envoie le premier message pour lancer la discussion, sans le nom du personnage`;
	}
	else
	{
		const transcript = history.map((m) => `${m.sender}: ${m.text}`).join('\n');
		userMessage = `${transcript}\n\nDonne uniquement la prochaine reponse de cette conversation, sans le nom du personnage`;
	}

	return [
		{ role: 'system', content: `${SYSTEM_PROMPT}\n${additionalContext}` },
		{ role: 'user', content: userMessage },
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

	const limits = quotaHeaders(response);
	if (limits.length)
		console.error(`[${model}] quotas :`, limits.join('  '));
}

//Les entetes de quota, sous forme "cle=valeur". Sur un 429 elles font la
//difference entre un debit sature (limit > 0, remaining tombe a 0 : ca
//repassera) et un compte sans droit d'inference (limit a 0 : ca ne repassera
//pas tout seul).
function quotaHeaders(response)
{
	const limits = [];
	for (const [key, value] of response.headers)
	{
		const k = key.toLowerCase();
		if (k.includes('ratelimit') || k === 'retry-after')
			limits.push(`${key}=${value}`);
	}
	return limits;
}

//fetch borne dans le temps. Renvoie la reponse, ou un verdict d'echec deja
//redige : ni l'un ni l'autre des appelants n'a de raison de distinguer une
//panne reseau d'un timeout autrement que par son libelle.
async function guardedFetch(url, options = {})
{
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), HEALTHCHECK_TIMEOUT_MS);

	try
	{
		return { response: await fetch(url, { ...options, signal: controller.signal }) };
	}
	catch (err)
	{
		if (err.name === 'AbortError')
			return { failure: { ok: false, reason: 'timeout', detail: `timeout apres ${HEALTHCHECK_TIMEOUT_MS} ms` } };
		return { failure: { ok: false, reason: 'unreachable', detail: `API injoignable : ${err.message}` } };
	}
	finally
	{
		clearTimeout(timer);
	}
}

//Un seul appel pour tout le processus : les trois agents Mistral partagent la
//meme cle, donc la meme liste. La memoisation porte sur la promesse et non sur
//le resultat, sinon trois healthChecks lances en parallele feraient trois
//requetes avant que la premiere ait repondu.
let modelsPromise = null;

function listModels()
{
	modelsPromise ??= fetchModels();
	return modelsPromise;
}

async function fetchModels()
{
	const { response, failure } = await guardedFetch(`${MISTRAL_API_URL}/models`,
	{
		headers: { 'Authorization': `Bearer ${apiKey}` },
	});
	if (failure)
		return failure;

	if (!response.ok)
		return { ok: false, reason: 'forbidden', detail: `HTTP ${response.status} sur /v1/models` };

	const data = await response.json();
	const models = (data.data ?? []).map((m) => m.id).sort();
	console.log(`  [mistral] ${models.length} modeles ouverts a cette cle : ${models.join(', ') || 'aucun'}`);
	return { ok: true, models };
}

//La seule maniere de savoir si la cle a le droit de generer. /v1/models repond
//200 sur un compte sans palier actif : il liste les modeles, et toutes les
//completions repartent en 429 avec limit-req-minute=0. Un token demande,
//quelques-uns envoyes : le cout au demarrage est negligeable, et c'est ce qui
//evite de decouvrir la panne au premier tour de jeu.
async function probeRateLimit(model)
{
	const { response, failure } = await guardedFetch(`${MISTRAL_API_URL}/chat/completions`,
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
			messages: [{ role: 'user', content: 'ping' }],
			max_tokens: 1,
		}),
	});
	if (failure)
		return failure;

	const quotas = quotaHeaders(response).join('  ');
	const suffix = quotas ? ` — ${quotas}` : '';

	if (response.status === 429)
	{
		//Deux pannes tres differentes derriere le meme code : le compte n'a
		//aucune allocation, ou le debit du palier est momentanement sature.
		const noAllowance = response.headers.get('x-ratelimit-limit-req-minute') === '0';
		return {
			ok: false,
			reason: noAllowance ? 'no_allowance' : 'rate_limited',
			detail: `429 sur /v1/chat/completions${suffix}`,
		};
	}

	if (!response.ok)
	{
		const forbidden = response.status === 401 || response.status === 403;
		return {
			ok: false,
			reason: forbidden ? 'forbidden' : 'http_error',
			detail: `HTTP ${response.status} : ${(await response.text()).slice(0, 200)}`,
		};
	}

	return { ok: true, detail: `${model} disponible${suffix}` };
}

//Deux etapes, parce qu'elles ne repondent pas a la meme question : /v1/models
//dit si la cle connait le modele, la sonde dit si le compte a le droit de s'en
//servir. Ne throw jamais : renvoie toujours { ok, detail }, plus un `reason`
//machine en cas d'echec, que le front traduit pour le joueur.
async function checkMistralModel(model)
{
	if (!apiKey)
		return { ok: false, reason: 'no_key', detail: 'MISTRAL_API_KEY absente' };

	const listed = await listModels();
	if (!listed.ok)
		return listed;

	if (!listed.models.includes(model))
		return { ok: false, reason: 'model_unavailable', detail: `modele ${model} indisponible sur cette cle` };

	return probeRateLimit(model);
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

//Ministral 3 14B : le plus gros generaliste NON raisonneur ouvert a la cle.
//Le choix se joue la — pour un message de dix mots, un modele qui raisonne
//paie de la latence sur le budget du tour et finit par laisser fuiter sa
//reflexion dans le chat. Mistral Small 4 est plus costaud mais raisonne, les
//autres modeles chat de la cle sont hors sujet (code, Lean, audio).
export const ministral_14b = createMistralAgent(
{
	name: 'ministral_14b',
	model: 'ministral-14b-latest',
});
