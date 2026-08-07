import { generateReply } from '../agents/index.js';

const BOT_MIN_DELAY = 2000; // delais minimal de reponse du bot
const MAX_CONSECUTIVE_FAILURES = 3; // au-dela, l'agent est considere mort et on arrete de l'appeler

//nombre de joueurs dans la partie, quelles sont les personnages de la partie,
//info sur les config (timeout etc)
//contexte meteo , 42 ??

export function createBotSendFn(room, botId, agentName)
{
	let consecutiveFailures = 0;
	let isDead = false;

	function kill(reason)
	{
		isDead = true;
		console.error(`[bot] ${botId} (${agentName}) considere mort : ${reason}`);
	}

	function onFailure(reason)
	{
		consecutiveFailures++;
		console.warn(`[bot] ${botId} (${agentName}) muet (${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}) : ${reason}`);
		if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES)
			kill(`${consecutiveFailures} echecs consecutifs`);
	}

	return async function botResponse (msg)
	{
		if (msg.type !== 'yourTurn')
			return;
		if (isDead)
			return;// disjoncteur ouvert : plus aucun appel a l'agent
		const maxDelayMs = Math.max(BOT_MIN_DELAY, msg.countdown * 1000) + 1500; //+1500 pour que parfois le bot ne reponde pas du tout si il depasse le delais.
		const targetDelayMs = randomInt(BOT_MIN_DELAY, maxDelayMs);
		try
		{
			const start = Date.now();
			const reply = await generateReply(room.history, agentName, add_context(room, botId));
			if (!reply)
			{
				onFailure('reponse vide');
				return;// l'API a échoué : le bot restera muet ce tour si le disjoncteur ne s'active pas
			}
			consecutiveFailures = 0;
			const remaining = targetDelayMs - (Date.now() - start);
			if (remaining > 0)
				await sleep(remaining);
			room.addMessage(botId, reply);
		}
		catch (err)
		{
			if (err.fatal)
				kill(err.message);// auth, quota, modele introuvable : reessayer ne sert a rien
			else
				onFailure(err.message);
		}
	};
}

//Le contexte est coupe en deux pour le KV cache d'ollama (voir
//agents/ollama_local.js) : `shared` est identique pour tous les bots de la
//manche et se place avant le transcript, `perBot` change a chaque appel
//(personnage, heure) et se place apres. Les agents distants, eux, recollent
//simplement les deux.
function add_context(room, botId)
{
	const character = room.currentRound.caracterOf(botId);
	const round_number = room.roundNumber;
	const playersNumber = room.numberOfPlayer;
	const charactersInTheTurn = room.currentRound.publicTurnOrder();
	const now = new Date();
	const date = now.toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' });
	const time = now.toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris' });

	const shared = [];
	shared.push(`il y'a ${playersNumber} joueur dans cette partie.`);
	shared.push(`les personnages de cette manche sont : ${charactersInTheTurn.join(', ')}
	c'est uniquement le nom par lequel les autres joueurs sont designe aleatoirement.
	tu peux l'utiliser pour t'adresser a eux`);
	shared.push(`Nous sommes au round ${round_number}.`);

	const perBot = [];
	perBot.push(`le nom de ton personnage lors de cette manche est ${character}. c'est uniquement le nom par lequel les autres joueurs t'apelle
		 ca ne definis pas qui tu es vraiment, ni ta personalite`);
	perBot.push(`Nous sommes le ${date}, il est ${time}.`);

	return { shared: shared.join('\n'), perBot: perBot.join('\n') };
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
