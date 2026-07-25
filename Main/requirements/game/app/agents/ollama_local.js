import { gameConfig } from '../game/config.js';
import { buildSystemPrompt } from './prompt.js';
const OLLAMA_URL = process.env.OLLAMA_URL
const OLLAMA_MODEL = process.env.OLLAMA_MODEL

const SYSTEM_PROMPT = buildSystemPrompt();
const TIMEOUT_MS = gameConfig.turnDuration * 1000;

export const mistral_7B_local =
{
	name: 'ollama',

	async generate(history, additionalContext = '')
	{
		console.log('[mistral] history recue:', JSON.stringify(history, null, 2));//#TMP
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
		const systemPrompt = `${SYSTEM_PROMPT}\n${additionalContext}`;
		const messages =
		[
			{ role: 'system', content: systemPrompt },
			{ role: 'user', content: userMessage },
		];
		return ask(messages);
	},
};

async function ask(messages)
{
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
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
				options: { temperature: 0.85, num_predict: 60 },
			}),
			signal: controller.signal,
		});
		if (!res.ok)
		return null;
		const data = await res.json();
		return data.message?.content?.trim() ?? null;
	}
	catch (err)
	{
		return null;//#TODO gerer le cas ou le bot ne reponds pas (hardcoder reponds ? annule partie ?)
	}
	finally
	{
		clearTimeout(timer);
	}
}
