import { generateReply } from '../agents/index.js';

export function createBotSendFn(room, botId, agentName)
{
	return async function (msg)
	{
		if (msg.type !== 'yourTurn')
			return;                          // le bot ignore tout le reste (il n'a pas d'écran)

		try
		{
			const reply = await generateReply(room.history, agentName);
			if (!reply)
				return;                      // l'API a échoué : le bot restera muet ce tour
			room.addMessage(botId, reply);

		}
		catch (err)
		{
			console.error('[bot] generation échouée :', err.message);
		}
	};
}
