// Une sonde /v1/models qui ne settle jamais ne doit plus figer les
// healthChecks : un fetch arrete qui ne rejette pas (constate en production
// apres un retour de reseau) laissait modelsPromise en attente pour toujours,
// et le cache de listModels condamnait chaque re-check a attendre un mort.
// Seul le redemarrage du conteneur s'en remettait.
import { check, report } from './check.mjs';

process.env.MISTRAL_API_KEY = 'fausse-cle';
process.env.MISTRAL_PROBE_TIMEOUT_MS = 100;	//montre courte pour le test

let appels = 0;
let zombie = true;
globalThis.fetch = async (url) =>
{
	appels++;
	//Le zombie ignore le signal d'abort : ni rejet, ni retour, jamais.
	if (zombie)
		return new Promise(() => {});
	const isModels = String(url).endsWith('/v1/models');
	return new Response(JSON.stringify(isModels ? { data: [{ id: 'mistral-medium-3.5' }] } : {}),
		{ status: 200 });
};

const { mistral_medium } = await import('../agents/mistral_common.js');

const bloque = await mistral_medium.healthCheck();
check('sonde zombie : le healthCheck rend quand meme la main', bloque.reason === 'timeout');
check('et le verdict est un echec', bloque.ok === false);

zombie = false;
const retour = await mistral_medium.healthCheck();
check('l echec zombie est oublie : /v1/models est rappele', appels >= 2);
check('et l agent revient', retour.ok === true);

report();
