//Agent local : un LLM servi par le conteneur ollama.
//Ollama garde en cache (KV cache) le debut du dernier prompt evalue : on envoie
//donc toujours le meme debut pour ne recalculer que la fin.

import { gameConfig, botEntries, DEFAULT_PROMPT } from '../game/config.js';
import { getPrompt, resolveSampling } from './prompt/index_prompt.js';

const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://ollama:11434';	//conteneur ollama
const OLLAMA_MODEL = process.env.OLLAMA_MODEL;	//ex. llama3.2:3b, defini dans .env

//Delais avant d'abandonner une requete
const TIMEOUT_MS = Math.max(1000, (gameConfig.turnDuration -0.5) * 1000);	//repondre avant la fin du tour
const HEALTHCHECK_TIMEOUT_MS = 5000;	//verif de demarrage
const PREFILL_TIMEOUT_MS = 120000;		//prechargement : ~30 s pour un prompt froid

//Options envoyees a ollama si le prompt ne les redefinit pas
const OLLAMA_OPTIONS =
{
	temperature: 0.85,		//creativite : plus haut = plus aleatoire
	num_predict: 24,		//longueur max de la reponse, en tokens
	num_ctx: 4096,			//fenetre de contexte ; la changer recharge le modele
	stop: ['\n'],			//coupe a la fin de la premiere ligne
	repeat_penalty: 1.15,	//penalise les tokens deja vus (1 = aucune)
	repeat_last_n: 256,		//nombre de tokens surveilles par repeat_penalty
};

//Noms communs a tous les agents -> noms ollama
const PORTABLE_OPTIONS =
{
	temperature: 'temperature',	//meme nom des deux cotes
	maxTokens: 'num_predict',	//longueur max de la reponse
	topP: 'top_p',				//ne tire que parmi les tokens les plus probables
	stop: 'stop',				//chaines qui arretent la generation
};

//Options finales pour ce prompt : defauts, puis son `sampling`
function resolveOptions(prompt)
{
	return resolveSampling(prompt, 'ollama', OLLAMA_OPTIONS, PORTABLE_OPTIONS);
}

export const local_agent =
{
	name: 'local_agent',

	//Verifie qu'ollama repond et que le modele est telecharge. Ne genere rien
	//et ne leve jamais : renvoie toujours { ok, reason?, detail }.
	async healthCheck()
	{
		if (!OLLAMA_MODEL)
			return { ok: false, reason: 'model_unavailable', detail: 'OLLAMA_MODEL non defini — voir .env.example' };

		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), HEALTHCHECK_TIMEOUT_MS);

		try
		{
			const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: controller.signal });
			if (!res.ok)
				return { ok: false, reason: 'http_error', detail: `HTTP ${res.status} sur /api/tags` };

			const data = await res.json();
			const tags = (data.models ?? []).map((m) => m.name);
			console.log(`  [ollama] ${tags.length} modeles pull : ${tags.join(', ') || 'aucun'}`);
			//sans tag, ollama range le modele sous :latest
			const wanted = OLLAMA_MODEL.includes(':') ? OLLAMA_MODEL : `${OLLAMA_MODEL}:latest`;
			if (!tags.includes(wanted))
				return { ok: false, reason: 'model_unavailable', detail: `modele ${wanted} pas pull (dispo : ${tags.join(', ') || 'aucun'})` };

			return { ok: true, detail: `${wanted} pull sur ${OLLAMA_URL}` };
		}
		catch (err)
		{
			if (err.name === 'AbortError')
				return { ok: false, reason: 'timeout', detail: `timeout apres ${HEALTHCHECK_TIMEOUT_MS} ms` };
			return { ok: false, reason: 'unreachable', detail: `injoignable sur ${OLLAMA_URL} : ${err.message}` };
		}
		finally
		{
			clearTimeout(timer);
		}
	},

	//Replique du bot pour ce tour. Le message va du plus stable au plus variable
	//(systeme, contexte, transcript, consigne) : le debut reste en cache.
	async generate(history, additionalContext = {}, prompt)
	{
		const { shared = '', perBot = '', character } = additionalContext;

		const systemPrompt = prompt.buildSystemPrompt();
		const userMessage = [shared, perBot, prompt.buildTranscript(history), prompt.buildInstruction(history, character)]
			.filter(Boolean)
			.join('\n\n');

		const messages =
		[
			{ role: 'system', content: systemPrompt },
			{ role: 'user', content: userMessage },
		];

		//debug : prompt complet envoye
		console.log(`----- [ollama] system (${prompt.name}) -----`);
		console.log(systemPrompt);
		console.log('----- [ollama] user -----');
		console.log(userMessage);
		console.log('-------------------------');

		return ask(messages, resolveOptions(prompt));
	},

	//Debut de manche : met en cache le systeme et le contexte avant le premier
	//tour du bot, sinon ce tour depasserait le temps imparti. Lent : sans await.
	async preheat(additionalContext = {}, prompt)
	{
		const { shared = '', perBot = '' } = additionalContext;
		const messages =
		[
			{ role: 'system', content: prompt.buildSystemPrompt() },
			{ role: 'user', content: [shared, perBot].filter(Boolean).join('\n\n') },
		];

		return prefill(messages, `prechauffage de la manche (${prompt.name})`, resolveOptions(prompt));
	},

	//Apres une panne (voir recheckDownAgents) : ollama relance a perdu le modele
	//en memoire, on le recharge.
	warmup()
	{
		return warmupOllama();
	},
};

//Prompt du premier bot ollama dans game/config.js, ou le defaut si son nom est
//inconnu. Le prechargement doit utiliser le meme message systeme que les vrais
//appels, sinon le cache ne sert a rien.
function configuredPrompt()
{
	const entry = botEntries().flat().find((b) => b.agent === local_agent.name);
	return getPrompt(entry?.prompt) ?? getPrompt(DEFAULT_PROMPT);
}

//Demarrage du serveur : charge le modele en memoire et met son message systeme
//en cache. Lent (dizaines de secondes) : a lancer sans await.
export async function warmupOllama()
{
	//absence deja signalee par checkAllAgents
	if (!OLLAMA_MODEL)
		return;

	const prompt = configuredPrompt();
	const messages =
	[
		{ role: 'system', content: prompt.buildSystemPrompt() },
		{ role: 'user', content: 'ok' },
	];

	return prefill(messages, `prechargement de ${OLLAMA_MODEL} (${prompt.name})`, resolveOptions(prompt));
}

//Fait evaluer un prompt sans vraiment generer (1 token, jete) : seul compte le
//cache qu'ollama en garde. Delai large : interrompu, il ne cacherait rien.
async function prefill(messages, label, options)
{
	const start = Date.now();
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), PREFILL_TIMEOUT_MS);

	console.log(`[ollama] ${label}...`);
	try
	{
		const res = await fetch(`${OLLAMA_URL}/api/chat`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(
			{
				model: OLLAMA_MODEL,
				messages,
				stream: false,
				keep_alive: '30m',
				options: { ...options, num_predict: 1 },
			}),
			signal: controller.signal,
		});

		if (!res.ok)
			return console.error(`[ollama] ${label} : HTTP ${res.status} :`, await res.text());

		logTimings(await res.json());
		console.log(`[ollama] ${label} : pret en ${Date.now() - start} ms`);
	}
	catch (err)
	{
		if (err.name === 'AbortError')
			console.error(`[ollama] ${label} : abandonne apres ${PREFILL_TIMEOUT_MS} ms`);
		else
			console.error(`[ollama] ${label} : ${err.message}`);
	}
	finally
	{
		clearTimeout(timer);
	}
}

//Tokens et durees d'un appel. Beaucoup de tokens en quelques ms : prompt
//retrouve dans le cache ; en plusieurs secondes : tout a ete recalcule.
function logTimings(data)
{
	const promptTok = data.prompt_eval_count ?? 0;
	const prefillMs = Math.round((data.prompt_eval_duration ?? 0) / 1e6);
	const decodeTok = data.eval_count ?? 0;
	const decodeMs = Math.round((data.eval_duration ?? 0) / 1e6);

	console.log(`[ollama] prompt ${promptTok} tok, prefill ${prefillMs} ms`
		+ ` | decode ${decodeTok} tok en ${decodeMs} ms`);
}

//Appel de generation d'un tour. Renvoie le texte, ou null en cas d'echec ou de
//timeout ; leve une erreur `fatal` si reessayer ne servirait a rien.
async function ask(messages, options)
{
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
	const start = Date.now();

	try
	{
		const res = await fetch(`${OLLAMA_URL}/api/chat`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(
			{
				model: OLLAMA_MODEL,
				messages,
				stream: false,
				keep_alive: '30m',
				options,
			}),
			signal: controller.signal,
		});

		if (!res.ok)
		{
			const body = await res.text();
			//acces refuse ou modele absent : definitif
			if ([401, 402, 403, 404].includes(res.status))
			{
				const fatalErr = new Error(`[ollama] HTTP ${res.status} : ${body}`);
				fatalErr.fatal = true;
				throw fatalErr;
			}
			console.error(`[ollama] HTTP ${res.status} :`, body);
			return null;
		}

		const data = await res.json();
		logTimings(data);
		console.log(`[ollama] genere en ${Date.now() - start} ms`);
		return data.message?.content?.trim() ?? null;
	}
	catch (err)
	{
		if (err.fatal)
			throw err;
		if (err.name === 'AbortError')
			console.error(`[ollama] timeout apres ${TIMEOUT_MS} ms — modele trop lent`);
		else
			console.error(`[ollama] echec reseau :`, err.message);
		return null;
	}
	finally
	{
		clearTimeout(timer);
	}
}
