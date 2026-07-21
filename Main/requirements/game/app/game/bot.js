import { generateReply } from '../agents/index.js';

const BOT_MIN_DELAY = 2000; // le bot ne répond jamais instantanément (trop robotique)

function sleep(ms)
{
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomInt(min, max)
{
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function createBotSendFn(room, botId, agentName)
{
	return async function botResponse (msg)
	{
		if (msg.type !== 'yourTurn')
			return;
		const maxDelayMs = Math.max(BOT_MIN_DELAY, msg.countdown * 1000) + 1500; //+1500 pour que parfois le bot ne reponde pas du tout si il depasse le delais.
		const targetDelayMs = randomInt(BOT_MIN_DELAY, maxDelayMs);
		try
		{
			const start = Date.now();
			const reply = await generateReply(room.history, agentName);
			if (!reply)
				return;// l'API a échoué : le bot restera muet ce tour

			const remaining = targetDelayMs - (Date.now() - start);
			if (remaining > 0)
				await sleep(remaining);
			room.addMessage(botId, reply);
		}
		catch (err)
		{
			console.error('[bot] generation échouée :', err.message);
		}
	};
}
