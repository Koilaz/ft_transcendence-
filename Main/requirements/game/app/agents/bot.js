import { generateReply } from './index_agent.js';
import { requirePrompt } from './prompt/index_prompt.js';
import { postTreatment } from './postTreatment.js';
import { gameConfig } from '../game/config.js';

const BOT_MIN_DELAY = 3000; // delais minimal de reponse du bot
const BOT_REACTION_MS = { min: 1000, max: 3000 }; // lecture du message precedent avant de taper
const BOT_TYPING_MS_PER_CHAR = { min: 100, max: 200 }; // vitesse de frappe : 5 a 10 caracteres par seconde
const MAX_CONSECUTIVE_FAILURES = 3; // au-dela, l'agent est considere mort : on arrete de l'appeler et sa manche est annulee
const BOT_SILENCE_CHANCE = 1 / 15; // un humain saute parfois son tour : le bot aussi
const BOT_CANNED_CHANCE = 1 / 15; // parfois une phrase toute faite au lieu de l'agent

const CANNED_REPLIES = [
	'C\'est les tenebres',
	'comment est votre blanquette ?',
	'est ce qu\'une ia peut dire rgj;roaekgaljaerlgjarelaerjk',
	'trklhjjdhlkwjgwrihaegjtwkl',
	'celui qui dit qui c\'est l\'ia je lui offre un sandwich',
	'Yamete kudasai',
	'Je vais aller au bocal',
	'a',
	'Ah',
	'ok boomer',
	'koikoube',
	'weqgrergrehgreg',
	'ok',
	'il est claque au sol ce jeux',
	'wertgrrqghrethtrhjrtjyryjrjrsjr',
	'vas y le tuteur valide le projet stp',
	'nkgkjlkjlkjljhnhgf',
	'5htrhrhrwyjgngfjdtyjetyjyejw',
];

//Le sendFn d'un bot, recree a chaque manche avec son couple { agent, prompt } (voir Room.applyBotRound).
export function createBotSendFn(room, botId, { agent: agentName, prompt: promptName })
{
	let consecutiveFailures = 0;
	let isDead = false;
	const label = `${botId} (${agentName} + ${promptName})`;

	//Mort : plus aucun appel jusqu'a la manche suivante, la room annule celle-ci et relance le healthcheck.
	function kill(reason, round)
	{
		isDead = true;
		console.error(`[bot] ${label} considere mort : ${reason}`);
		room.cancelRound(round);
	}

	function onFailure(reason, round)
	{
		consecutiveFailures++;
		console.warn(`[bot] ${label} muet (${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}) : ${reason}`);
		if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES)
			kill(`${consecutiveFailures} echecs consecutifs`, round);
	}

	//Reponse de l'agent, null si l'API a echoue : c'est le prompt qui raconte la partie au modele.
	async function askAgent()
	{
		const prompt = requirePrompt(promptName);// prompt inconnu : erreur fatale
		return generateReply(room.history, agentName, prompt.buildContextPrompt(room, botId), promptName);
	}

	async function speak(character, countdown)
	{
		const start = Date.now();
		const rawReply = pickCannedReply() ?? await askAgent();
		if (!rawReply)
			throw new Error('reponse vide');// l'agent a echoue sans erreur fatale
		consecutiveFailures = 0;
		//Fautes de frappe, puis meme coupure que pour un humain : un message trop long trahirait le bot.
		const reply = postTreatment(rawReply, character).slice(0, gameConfig.maxMessageLength);
		//La generation compte dans le delai humain : on n'attend que ce qu'il en reste.
		const targetDelayMs = replyDelayMs(reply, countdown);
		const genMs = Date.now() - start;
		if (genMs < targetDelayMs)
			await sleep(targetDelayMs - genMs);
		logDelivery(reply, { countdown, start, genMs, targetDelayMs });//#TMP
		room.addMessage(botId, reply);
	}

	//#TMP a supprimer avec son appel : room.addMessage throw sans rien dire un message arrive apres son tour.
	function logDelivery(reply, { countdown, start, genMs, targetDelayMs })
	{
		const current = room.currentRound;
		const aLaParole = current?.status === 'chatting' && current.canSpeak(botId);
		console.log(`[#TMP bot] ${label}`
			+ ` gen=${genMs}ms cible=${targetDelayMs}ms (${reply.length} car.) attente=${Math.max(0, targetDelayMs - genMs)}ms total=${Date.now() - start}ms`
			+ ` budget=${countdown}s`
			+ ` | round=${current?.status ?? 'aucun'}`
			+ ` | ${aLaParole ? 'ENVOI' : 'JETE (le tour est deja passe)'}`
			+ ` | "${reply}"`);
	}

	return async function botResponse(msg)
	{
		if (msg.type !== 'yourTurn' || isDead)
			return;
		//Tirage avant l'appel : un tour muet ne coute rien a l'API et ne compte pas comme un echec.
		if (Math.random() < BOT_SILENCE_CHANCE)
			return console.log(`[bot] ${label} muet ce tour (tirage aleatoire)`);
		//Lue avant l'appel : la manche peut changer pendant la generation, c'est celle-ci qu'un echec annule.
		const round = room.currentRound;
		try
		{
			await speak(round.caracterOf(botId), msg.countdown);
		}
		catch (err)
		{
			if (err.fatal)
				kill(err.message, round);// auth, quota, modele introuvable : reessayer ne sert a rien
			else
				onFailure(err.message, round);
		}
	};
}

//Lire puis taper, borne entre BOT_MIN_DELAY et le tour entier : un long message peut arriver trop tard.
function replyDelayMs(reply, countdown)
{
	const reading = randomInt(BOT_REACTION_MS.min, BOT_REACTION_MS.max);
	const typing = reply.length * randomInt(BOT_TYPING_MS_PER_CHAR.min, BOT_TYPING_MS_PER_CHAR.max);
	const maxDelayMs = Math.max(BOT_MIN_DELAY, countdown * 1000);
	return Math.min(maxDelayMs, Math.max(BOT_MIN_DELAY, reading + typing));
}

//Une phrase de CANNED_REPLIES avec la probabilite BOT_CANNED_CHANCE, sinon null.
function pickCannedReply()
{
	if (Math.random() >= BOT_CANNED_CHANCE)
		return null;
	return CANNED_REPLIES[Math.floor(Math.random() * CANNED_REPLIES.length)];
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

