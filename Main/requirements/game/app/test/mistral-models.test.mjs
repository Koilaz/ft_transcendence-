// Au boot, le reseau de l'hote peut ne pas etre pret : /v1/models echoue. Avant,
// cet echec restait en memoire, aucun re-check ne rappelait l'API et les agents
// Mistral restaient KO jusqu'au redemarrage de game.
import { check, report } from './check.mjs';

// Aucun appel reseau : fetch est remplace, et la cle n'a pas besoin d'etre vraie.
process.env.MISTRAL_API_KEY = 'fausse-cle';
let enLigne = false;
let listes = 0;
globalThis.fetch = async (url) =>
{
	const isModels = String(url).endsWith('/v1/models');
	if (isModels)
		listes++;
	if (!enLigne)
		throw new TypeError('fetch failed');
	const body = isModels ? { data: [{ id: 'mistral-medium-3.5' }, { id: 'mistral-small-latest' }] } : {};
	return new Response(JSON.stringify(body), { status: 200 });
};

const { mistral_medium, mistral_small } = await import('../agents/mistral_common.js');

const coupes = await Promise.all([mistral_medium.healthCheck(), mistral_small.healthCheck()]);
check('reseau coupe : les agents sont injoignables', coupes.every((r) => r.reason === 'unreachable'));
check('deux healthChecks en parallele partagent la meme requete', listes === 1);

enLigne = true;
const retour = await mistral_medium.healthCheck();
check('reseau revenu : le re-check rappelle /v1/models', listes === 2);
check('et l agent est de nouveau disponible', retour.ok === true);

const suivant = await mistral_small.healthCheck();
check('une liste obtenue est gardee : plus de nouvel appel', listes === 2);
check('et elle sert aux autres agents', suivant.ok === true);

report();
