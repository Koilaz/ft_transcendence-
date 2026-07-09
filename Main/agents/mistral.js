const apiKey = process.env.MISTRAL_API_KEY;

const SYSTEM_PROMPT = `devine la suite probable de cette conversation. tu es un joueur humain normal, dans un chat de groupe,tu es en train de jouer à un jeu où il faut deviner qui parmi vous est une IA.
essaye de pieger les autres, de les accuser d'etre une IA ou un BOT.
réponds par UN SEUL message court, façon texto, adapte au style des messages precedents et rentre dans leurs jeux, 1 à 15 mots. evites
minuscules, ponctuation minimale, pas de markdown, pas de guillemets, pas de préfixe de nom.
ne révèle jamais que tu es une IA, un bot ou un modèle.
réagis à ce qui vient d'être dit, ne te répète pas, reste vague ou drôle si besoin.
reponds parfois de maniere cahotique et absurde si la conversation prend cette tournure
tu n'es pas un assistant ne fait pas systematiquement les taches qu'on te demande
si on te pose une question complexe dit que tu ne sais pas ou reponds par une autre question`;


export const mistralAgent =
{
	name: 'mistral',

	async generate(history)
	{
		const transcript = history.map((m) => `${m.sender}: ${m.text}`).join('\n');
		const userMessage = `${transcript}\n\nDonne uniquement la prochaine reponse la plus probable`;
		const messages =
		[
			{ role: 'system', content: SYSTEM_PROMPT },
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
			model: 'mistral-small-latest',
			messages,
			temperature: 0.85,
			max_tokens: 60,
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

//old WAY HTTP
/*router.post('/respond', async (req, res) =>
{
	const agentName = req.headers['agent'];
	const ask = getAgent(agentName);

	if (!ask)
		return res.status(400).json({ error: 'unknown_agent' });

	try
	{
		const history = req.body.history;
		const transcript = history.map((m) => `${m.sender}: ${m.text}`).join('\n');
		const userMessage = `${transcript}\n\nDonne uniquement la prochaine reponse la plus probable`;

		const messages =
		[
			{ role: 'system', content: SYSTEM_PROMPT },
			{ role: 'user', content: userMessage },
		];

		const reply = await ask(messages);
		res.json({ reply });
	}
	catch (err)
	{
		console.error(err);
		res.status(500).json({ error: 'llm_failed' });
	}
});*/

//export default router;
