import { gameConfig, botEntries, DEFAULT_PROMPT } from '../game/config.js';
import { getPrompt } from './prompt/index_prompt.js';

const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://ollama:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL;

const TIMEOUT_MS = Math.max(1000, (gameConfig.turnDuration -0.5) * 1000);
const HEALTHCHECK_TIMEOUT_MS = 5000;
const PREFILL_TIMEOUT_MS = 120000;

//num_ctx est un parametre de chargement : ollama decharge et recharge le modele
//des qu'il change d'un appel a l'autre. Le warmup et ask doivent donc envoyer
//exactement les memes options, sinon le prechargement est perdu au premier tour.
const OLLAMA_OPTIONS =
{
	temperature: 0.80,
	//Marge sur les 10 mots demandes dans le prompt : le francais tokenise a
	//environ 2 tokens par mot. 24 laisse le modele finir sa phrase, et c'est
	//aussi le pire cas du budget d'un tour — sur CPU il decode environ 4 tokens
	//par seconde, donc chaque unite ici coute un quart de seconde d'attente.
	num_predict: 24,
	num_ctx: 4096,
	stop: ['\n'],
	//Sans ces deux lignes, ollama n'applique aucune penalite : repeat_penalty
	//vaut 1.0, c'est-a-dire desactivee. Rien n'empeche alors le bot de reemettre
	//sa phrase precedente mot pour mot, puisqu'elle figure dans le transcript.
	//La fenetre par defaut, 64 tokens, ne couvre que la consigne finale : il faut
	//qu'elle remonte assez loin pour atteindre les dernieres repliques.
	repeat_penalty: 1.15,
	repeat_last_n: 256,
};

//Vocabulaire portable des prompts traduit vers celui d'ollama. Un prompt ne
//declare que ce qu'il veut changer ; le bloc `ollama` passe tel quel, pour les
//reglages qui n'existent que chez lui.
//num_ctx et keep_alive n'y figurent pas volontairement : ce sont des parametres
//de chargement, les laisser varier d'un prompt a l'autre ferait recharger le
//modele a chaque alternance de bot.
const PORTABLE_OPTIONS =
{
	temperature: 'temperature',
	maxTokens: 'num_predict',
	topP: 'top_p',
	stop: 'stop',
};

function resolveOptions(prompt)
{
	const { ollama = {}, ...portable } = prompt?.sampling ?? {};
	const options = { ...OLLAMA_OPTIONS };

	for (const [key, value] of Object.entries(portable))
	{
		const name = PORTABLE_OPTIONS[key];
		if (name)
			options[name] = value;
	}

	return { ...options, ...ollama };
}

export const local_agent =
{
	name: 'local_agent',

	//Purement informatif : liste les modeles pull, ne genere rien.
	//N'echoue jamais par exception, renvoie toujours { ok, detail }.
	async healthCheck()
	{
		//Aucun modele a demander : ollama n'en choisit pas pour nous, /api/chat
		//exige un nom explicite. Inutile d'aller jusqu'au reseau pour l'apprendre.
		if (!OLLAMA_MODEL)
			return { ok: false, reason: 'model_unavailable', detail: 'OLLAMA_MODEL non defini — voir env.example' };

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
			//le tag compte : llama3.2 et llama3.2:3b sont deux entrees distinctes.
			//sans tag explicite, ollama stocke sous :latest
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

	//Tout est ordonne pour le KV cache d'ollama, du plus stable au plus volatile :
	//le message systeme ne bouge jamais, les deux blocs de contexte tiennent la
	//manche entiere, le transcript ne grandit que par la fin, et seule la
	//consigne finale se retrouve systematiquement recalculee. Ollama relit le
	//reste depuis son cache.
	//Ce n'est pas une micro-optimisation : le prefill tourne a une dizaine de
	//tokens par seconde sur CPU, donc un bloc volatile place trop tot coute une
	//trentaine de secondes par tour, largement au-dela du budget d'un tour.
	//Le transcript et la consigne arrivent separement du prompt : c'est le seul
	//agent qui a besoin de glisser le contexte entre les deux.
	async generate(history, additionalContext = {}, prompt)
	{
		const { shared = '', perBot = '' } = additionalContext;

		const systemPrompt = prompt.buildSystemPrompt();
		const userMessage = [shared, perBot, prompt.buildTranscript(history), prompt.buildInstruction(history)]
			.filter(Boolean)
			.join('\n\n');

		const messages =
		[
			{ role: 'system', content: systemPrompt },
			{ role: 'user', content: userMessage },
		];

		//#TMP a supprimer : prompt complet envoye a ollama
		console.log(`----- [ollama] system (${prompt.name}) -----`);
		console.log(systemPrompt);
		console.log('----- [ollama] user -----');
		console.log(userMessage);
		console.log('-------------------------');

		return ask(messages, resolveOptions(prompt));
	},

	//Fait evaluer d'avance le prefixe stable de la manche — message systeme et
	//contexte — pour qu'il soit deja dans le cache KV quand le bot prend la
	//parole. Sans ca, le premier appel de la manche paie plusieurs centaines de
	//tokens de prefill et depasse a lui seul le budget d'un tour.
	//A lancer sans await : l'appel dure plusieurs dizaines de secondes.
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
};

//Le prompt reellement attribue a cet agent dans game/config.js. Le
//prechargement doit envoyer exactement le message systeme des vrais appels,
//sinon le KV cache amorce ne sert a rien (voir warmupOllama). Un nom de prompt
//errone est deja signale par checkAllAgents : ici on se rabat sur le defaut
//plutot que de faire echouer le prechargement.
function configuredPrompt()
{
	const entry = botEntries().find((b) => b.agent === local_agent.name);
	return getPrompt(entry?.prompt) ?? getPrompt(DEFAULT_PROMPT);
}

//Charge le modele en memoire ET amorce le KV cache : lent (plusieurs dizaines
//de secondes au premier appel). A lancer sans await pour ne pas retarder le
//demarrage du serveur.
//On envoie le meme message systeme que generate() au lieu d'un tableau vide :
//sinon seuls les poids sont charges, le cache reste vide et le premier tour
//repaie l'integralite du prefill.
export async function warmupOllama()
{
	//checkAllAgents tourne avant et a deja signale l'absence de modele : le
	//redire ici n'apprendrait rien.
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

//Un appel qui ne sert qu'a faire evaluer son prompt : num_predict a 1, la
//reponse est jetee, ce qui reste est le cache KV d'ollama. num_predict est un
//parametre d'echantillonnage et non de chargement : le surcharger ne fait pas
//recharger le modele, contrairement a num_ctx.
//Il lui faut son propre delai, bien plus large que celui d'un tour : evaluer un
//prompt froid prend une trentaine de secondes, et l'interrompre a mi-chemin
//reviendrait a ne rien precharger du tout.
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

//prompt_eval_count compte tout le prompt, y compris ce qui vient du cache :
//seule la duree dit ce qu'ollama a reellement evalue. Les deux chiffres se
//lisent ensemble — quelques centaines de tokens prefilles en quelques
//millisecondes signifient que le prefixe a ete retrouve dans le cache KV, les
//memes en dizaines de secondes qu'il a fallu tout recalculer.
function logTimings(data)
{
	const promptTok = data.prompt_eval_count ?? 0;
	const prefillMs = Math.round((data.prompt_eval_duration ?? 0) / 1e6);
	const decodeTok = data.eval_count ?? 0;
	const decodeMs = Math.round((data.eval_duration ?? 0) / 1e6);

	console.log(`[ollama] prompt ${promptTok} tok, prefill ${prefillMs} ms`
		+ ` | decode ${decodeTok} tok en ${decodeMs} ms`);
}

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
