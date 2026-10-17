import { generateReply } from '../agents/index_agent.js';
import { requirePrompt } from '../agents/prompt/index_prompt.js';
import { postTreatment } from './typos.js';
import { gameConfig } from './config.js';

const BOT_MIN_DELAY = 2000; // delais minimal de reponse du bot
const BOT_REACTION_MS = { min: 1000, max: 3000 }; // lecture du message precedent avant de taper
const BOT_TYPING_MS_PER_CHAR = { min: 100, max: 200 }; // vitesse de frappe : 5 a 10 caracteres par seconde
const MAX_CONSECUTIVE_FAILURES = 3; // au-dela, l'agent est considere mort et on arrete de l'appeler
const BOT_SILENCE_CHANCE = 1 / 15; // un humain saute parfois son tour : le bot aussi

//nombre de joueurs dans la partie, quelles sont les personnages de la partie,
//info sur les config (timeout etc)
//contexte meteo , 42 ??

//Le bot recoit son couple { agent, prompt } tel qu'il est ecrit dans
//gameConfig.bots : le modele qui repond et le texte qu'on lui envoie sont deux
//reglages independants, ils voyagent ensemble jusqu'a l'appel.
export function createBotSendFn(room, botId, { agent: agentName, prompt: promptName })
{
	let consecutiveFailures = 0;
	let isDead = false;
	const identity = `${agentName} + ${promptName}`;

	function kill(reason)
	{
		isDead = true;
		console.error(`[bot] ${botId} (${identity}) considere mort : ${reason}`);
	}

	function onFailure(reason)
	{
		consecutiveFailures++;
		console.warn(`[bot] ${botId} (${identity}) muet (${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}) : ${reason}`);
		if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES)
			kill(`${consecutiveFailures} echecs consecutifs`);
	}

	return async function botResponse (msg)
	{
		if (msg.type !== 'yourTurn')
			return;
		if (isDead)
			return;// disjoncteur ouvert : plus aucun appel a l'agent
		//Tire avant l'appel : un tour muet ne coute rien a l'API et ne compte
		//pas comme un echec. Loggue pour ne pas le confondre avec une panne.
		if (Math.random() < BOT_SILENCE_CHANCE)
		{
			console.log(`[bot] ${botId} (${identity}) muet ce tour (tirage aleatoire)`);
			return;
		}
		const maxDelayMs = Math.max(BOT_MIN_DELAY, msg.countdown * 1000); //1000 pour que parfois le bot ne reponde pas du tout si il depasse le delais.
		try
		{
			const start = Date.now();
			//Le contexte de la partie vient du prompt lui-meme : c'est lui qui
			//decide comment l'etat du jeu se raconte au modele. Un nom de prompt
			//absent du registre jette une erreur fatale, traitee plus bas comme
			//un agent introuvable.
			const prompt = requirePrompt(promptName);
			const rawReply = await generateReply(room.history, agentName, prompt.buildContextPrompt(room, botId), promptName);
			if (!rawReply)
			{
				onFailure('reponse vide');
				return;// l'API a échoué : le bot restera muet ce tour si le disjoncteur ne s'active pas
			}
			consecutiveFailures = 0;
			//fautes de frappe : le bot doit passer pour un humain (minuscules et
			//repetitions sont traitees pour tous dans room.addMessage). Meme coupure que
			//pour les humains : un message plus long que ce que le front laisse
			//taper trahirait le bot.
			const reply = postTreatment(rawReply).slice(0, gameConfig.maxMessageLength);
			const targetDelayMs = replyDelayMs(reply, maxDelayMs);
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
			console.log(`[#TMP bot] ${botId} (${identity})`
				+ ` gen=${genMs}ms cible=${targetDelayMs}ms (${reply.length} car.) attente=${Math.max(0, remaining)}ms total=${Date.now() - start}ms`
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

//Le temps qu'un humain mettrait a envoyer ce message : lire, puis taper chaque
//caractere. Vitesse de frappe tiree a chaque message, comme un joueur plus ou
//moins concentre. La generation se deroule pendant ce temps et ne s'y ajoute
//pas. Un message trop long pour le tour peut arriver trop tard, comme celui
//d'un humain.
function replyDelayMs(reply, maxDelayMs)
{
	const reading = randomInt(BOT_REACTION_MS.min, BOT_REACTION_MS.max);
	const typing = reply.length * randomInt(BOT_TYPING_MS_PER_CHAR.min, BOT_TYPING_MS_PER_CHAR.max);
	return Math.min(maxDelayMs, Math.max(BOT_MIN_DELAY, reading + typing));
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

