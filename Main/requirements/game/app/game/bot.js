import { generateReply } from '../agents/index.js';
import { buildContextPrompt } from '../agents/prompt.js';
import { postTreatment } from './typos.js';

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
		const maxDelayMs = Math.max(BOT_MIN_DELAY, msg.countdown * 1000); //1000 pour que parfois le bot ne reponde pas du tout si il depasse le delais.
		const targetDelayMs = randomInt(BOT_MIN_DELAY, maxDelayMs);
		try
		{
			const start = Date.now();
			const rawReply = await generateReply(room.history, agentName, buildContextPrompt(room, botId));
			if (!rawReply)
			{
				onFailure('reponse vide');
				return;// l'API a échoué : le bot restera muet ce tour si le disjoncteur ne s'active pas
			}
			consecutiveFailures = 0;
			const reply = postTreatment(rawReply);// fautes de frappe : le bot doit passer pour un humain
			const genMs = Date.now() - start;
			const remaining = targetDelayMs - genMs;
			if (remaining > 0)
				await sleep(remaining);

			//#TMP a supprimer : pourquoi un bot reste muet alors que l'agent a
			//bien repondu. room.addMessage jette le message sans rien dire si le
			//tour est deja passe (canSpeak faux), et ce cas ne compte pas comme
			//un echec : le bot parait muet sans qu'aucune ligne ne l'explique.
			const round = room.currentRound;
			const aLaParole = round?.status === 'chatting' && round.canSpeak(botId);
			console.log(`[#TMP bot] ${botId} (${agentName})`
				+ ` gen=${genMs}ms attente=${Math.max(0, remaining)}ms total=${Date.now() - start}ms`
				+ ` budget=${msg.countdown}s`
				+ ` | round=${round?.status ?? 'aucun'}`
				+ ` | ${aLaParole ? 'ENVOI' : 'JETE (le tour est deja passe)'}`
				+ ` | "${reply}"`);
			/**/
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
