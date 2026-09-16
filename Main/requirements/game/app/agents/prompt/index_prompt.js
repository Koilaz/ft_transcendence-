//Liste les differents prompts disponibles.
//
//Un prompt et un agent sont deux choses independantes : l'agent dit QUI
//repond (quel modele, quelle API), le prompt dit COMMENT on le lui demande.
//C'est gameConfig.bots qui marie les deux, agent par agent — aucun agent ne
//choisit son texte lui-meme, sinon le prompt reellement envoye ne se lit plus
//dans la config mais dans le code de l'agent.
//
//Contrat d'un prompt : { name, buildSystemPrompt, buildInstruction,
//buildUserPrompt, buildTranscript, buildContextPrompt, sampling }.
//
//Tout est fourni par prompt/context.js, et un prompt ne redefinit que ce qui
//le distingue :
//  buildTranscript     buildTranscript (balise) ou buildRawTranscript (nu)
//  buildContextPrompt  composeContext([...]) — la liste des blocs voulus, par
//                      cle du registre ou ecrits sur place
//  sampling            optionnel. Les cles de premier niveau sont portables
//                      (temperature, maxTokens, topP, stop) et chaque agent les
//                      traduit ; une cle nommee d'apres un agent (`ollama`,
//                      `mistral`) lui est transmise telle quelle. Absent, le
//                      prompt herite des defauts de l'agent.
//  debrief             optionnel. `true` si le prompt consomme les blocs
//                      roundSummary et corrections : la room declenche alors
//                      l'analyse d'apres-manche (voir prompt/debrief.js), et
//                      prolonge sa transition le temps qu'elle reponde.

import { prompt_default } from './prompt_default.js';
import { prompt_easy } from './prompt_easy.js';
import { prompt_basic } from './prompt_basic.js';
import { prompt_advanced } from './prompt_advanced.js';

const prompts =
{
	[prompt_default.name]: prompt_default,
	[prompt_easy.name]: prompt_easy,
	[prompt_basic.name]: prompt_basic,
	[prompt_advanced.name]: prompt_advanced,
};

//Les cles du registre, c'est-a-dire les seules valeurs acceptees dans le champ
//`prompt` de gameConfig.bots. Sert aussi a construire les messages d'erreur.
export function availablePrompts()
{
	return Object.keys(prompts);
}

//null si le nom est inconnu : l'appelant decide si c'est fatal (une partie qui
//demarre) ou si ca se signale simplement (le rapport de sante du demarrage).
export function getPrompt(name)
{
	return prompts[name] ?? null;
}

//Meme version, mais pour les appels d'ou l'on ne peut pas repartir : un nom de
//prompt absent du registre ne se repare pas tout seul, inutile de laisser le
//bot retenter deux fois avant d'abandonner.
export function requirePrompt(name)
{
	const prompt = getPrompt(name);
	if (!prompt)
	{
		const err = new Error(`unknown_prompt "${name}"`
			+ ` — corrige bots dans game/config.js.`
			+ ` Prompts disponibles : ${availablePrompts().join(', ')}`);
		err.fatal = true;
		throw err;
	}

	return prompt;
}
