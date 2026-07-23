import { generateReply } from '../agents/index.js';

const BOT_MIN_DELAY = 2000; // delais minimal de reponse du bot

//nombre de joueurs dans la partie, quelles sont les personnages de la partie,
//info sur les config (timeout etc)
//contexte meteo , 42 ??

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
			const additionalContext = add_context(room, botId);
			const reply = await generateReply(room.history, agentName, additionalContext);
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

function add_context(room, botId)
{
	let context = [];
	const character = room.currentRound.caracterOf(botId);
	const round_number = room.roundNumber;
	const playersNumber = room.numberOfPlayer;
	const charactersInTheTurn = room.currentRound.publicTurnOrder();
	const now = new Date();
	const date = now.toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' });
	const time = now.toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris' });
	context.push(`le nom de ton personnage lors de cette manche est ${character}. c'est uniquement le nom par lequel les autres joueurs t'apelle
		 ca ne definis pas qui tu es vraiment, ni ta personalite`);
	context.push(`il y'a ${playersNumber} joueur dans cette partie.`);
	context.push(`les personnages de cette manche sont : ${charactersInTheTurn.join(', ')}
	c'est uniquement le nom par lequel les autres joueurs sont designe aleatoirement.
	tu peux l'utiliser pour t'adresser a eux`);
	context.push(`Nous sommes au round ${round_number}.`);
	context.push(`Nous sommes le ${date}, il est ${time}.`);

	return context.join('\n');
}

function sleep(ms)
{
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomInt(min, max)
{
	return Math.floor(Math.random() * (max - min + 1)) + min;
}
//#TODO troncation aleatoire des messages (selement si on envoi les message dans la inbox pqs complet voir FRONT)
//#TODO randomize syntaxe error (inverse ou supprime une lettre)
//#TODO
