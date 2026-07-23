import { buildSystemPrompt } from './prompt.js';

const apiKey = process.env.MISTRAL_API_KEY;
const SYSTEM_PROMPT = buildSystemPrompt();

export const mistralAgent =
{
	name: 'mistral_medium',

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
	const response = await fetch('https://api.mistral.ai/v1/chat/completions',
	{
		method: 'POST',
		headers:
		{
			'Authorization': `Bearer ${apiKey}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(
		{
			model: 'mistral-medium-3.5',
			messages,
			temperature: 0.85,
			max_tokens: 70,
		}),
	});
	if (!response.ok)
	{
		const errText = await response.text();
		console.error('Erreur Mistral', response.status, errText);
		return null;
	}
	const data = await response.json();
	return data.choices[0].message.content;
}
