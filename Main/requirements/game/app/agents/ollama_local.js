import { gameConfig } from '../game/config.js';
import { buildSystemPrompt } from './prompt_easy.js';

const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://ollama:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'mistral:7b';

const SYSTEM_PROMPT = buildSystemPrompt();
const TIMEOUT_MS = Math.max(1000, (gameConfig.turnDuration -0.5) * 1000);
const HEALTHCHECK_TIMEOUT_MS = 5000;

//num_ctx est un parametre de chargement : ollama decharge et recharge le modele
//des qu'il change d'un appel a l'autre. Le warmup et ask doivent donc envoyer
//exactement les memes options, sinon le prechargement est perdu au premier tour.
const OLLAMA_OPTIONS =
{
	temperature: 0.85,
	//Marge sur les 10 mots demandes dans le prompt : le francais tokenise a
	//environ 2 tokens par mot, donc 40 laisse le modele finir sa phrase au lieu
	//d'etre coupe net au milieu.
	num_predict: 40,
	num_ctx: 4096,
	stop: ['\n'],
};

export const mistral_7B_local =
{
	name: 'mistral_7B_local',

	//Purement informatif : liste les modeles pull, ne genere rien.
	//N'echoue jamais par exception, renvoie toujours { ok, detail }.
	async healthCheck()
	{
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
			//le tag compte : mistral et mistral:7b sont deux entrees distinctes.
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

	//Tout est ordonne pour le KV cache d'ollama : du plus stable au plus
	//volatile. Le message systeme ne bouge jamais, le contexte partage ne bouge
	//pas de la manche, le transcript ne fait que grandir par la fin. Ollama
	//relit ce prefixe depuis son cache et ne reevalue que la queue : le
	//contexte du bot (personnage, heure) et la consigne finale.
	//Deplacer un seul de ces blocs vers le debut ferait repayer le prefill
	//complet a chaque tour.
	async generate(history, additionalContext = {})
	{
		const { shared = '', perBot = '' } = additionalContext;

		let transcript = '';
		let instruction;
		if (!history || history.length === 0)
		{
			instruction = `La conversation n'a pas encore commence. Envoie le premier message pour lancer la discussion, sans le nom du personnage, en 1 a 7 mots maximum, sans accent ni majuscule`;
		}
		else
		{
			transcript = history.map((m) => `${m.sender}: ${m.text}`).join('\n');
			instruction = `Donne uniquement la prochaine reponse de cette conversation, sans le nom du personnage, en 3 a 8 mots, sans accent ni majuscule`;
		}

		const userMessage = [shared, transcript, perBot, instruction]
			.filter(Boolean)
			.join('\n\n');

		const messages =
		[
			{ role: 'system', content: SYSTEM_PROMPT },
			{ role: 'user', content: userMessage },
		];

		//#TMP a supprimer : prompt complet envoye a ollama
		console.log('----- [ollama] system -----');
		console.log(SYSTEM_PROMPT);
		console.log('----- [ollama] user -----');
		console.log(userMessage);
		console.log('-------------------------');

		return ask(messages);
	},
};

//Charge le modele en memoire ET amorce le KV cache : lent (plusieurs dizaines
//de secondes au premier appel). A lancer sans await pour ne pas retarder le
//demarrage du serveur.
//On envoie le meme message systeme que generate() au lieu d'un tableau vide :
//sinon seuls les poids sont charges, le cache reste vide et le premier tour
//repaie l'integralite du prefill. num_predict est un parametre
//d'echantillonnage et non de chargement : le surcharger ne fait pas recharger
//le modele, contrairement a num_ctx.
export async function warmupOllama()
{
	const start = Date.now();
	console.log(`[ollama] prechargement de ${OLLAMA_MODEL}...`);
	try
	{
		const res = await fetch(`${OLLAMA_URL}/api/chat`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(
			{
				model: OLLAMA_MODEL,
				messages:
				[
					{ role: 'system', content: SYSTEM_PROMPT },
					{ role: 'user', content: 'ok' },
				],
				stream: false,
				keep_alive: '30m',
				options: { ...OLLAMA_OPTIONS, num_predict: 1 },
			}),
		});
		if (!res.ok)
			console.error(`[ollama] prechargement HTTP ${res.status} :`, await res.text());
		else
		{
			logTimings(await res.json());
			console.log(`[ollama] pret en ${Date.now() - start} ms`);
		}
	}
	catch (err)
	{
		console.error(`[ollama] injoignable sur ${OLLAMA_URL} :`, err.message);
	}
}

//prefill = les tokens du prompt qu'ollama a reellement du evaluer. Quand le
//prefixe est retrouve dans le KV cache, ces champs chutent (voire disparaissent
//de la reponse) : c'est le signe que le cache a servi.
function logTimings(data)
{
	const prefillTok = data.prompt_eval_count ?? 0;
	const prefillMs = Math.round((data.prompt_eval_duration ?? 0) / 1e6);
	const decodeTok = data.eval_count ?? 0;
	const decodeMs = Math.round((data.eval_duration ?? 0) / 1e6);

	console.log(`[ollama] prefill ${prefillTok} tok en ${prefillMs} ms`
		+ ` | decode ${decodeTok} tok en ${decodeMs} ms`);
}

async function ask(messages)
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
				options: OLLAMA_OPTIONS,
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
