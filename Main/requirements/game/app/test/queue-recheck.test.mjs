// Un agent hors service peut revenir (conteneur ollama relance). La file doit
// s'en apercevoir seule et prevenir les joueurs qui attendent : avant, elle
// les bloquait jusqu'au redemarrage de game.
import { gameConfig } from '../game/config.js';

// Aucun appel reseau : sans cle, les agents Mistral repondent no_key tout de
// suite, et l'agent local est remplace par un faux plus bas.
delete process.env.MISTRAL_API_KEY;
gameConfig.bots = ['local_agent'];
gameConfig.agentRecheckDelay = 0.05;

const { local_agent } = await import('../agents/ollama_local.js');
let enLigne = false;
let prechauffages = 0;
// 'timeout' et non 'unreachable' : checkAllAgents insisterait dix secondes.
local_agent.healthCheck = async () => (enLigne
	? { ok: true, detail: 'de retour' }
	: { ok: false, reason: 'timeout', detail: 'hors service' });
local_agent.warmup = async () => { prechauffages++; };

const { checkAllAgents, unavailableBots } = await import('../agents/index_agent.js');
const { enqueue } = await import('../game/queue.js');
const { check, report } = await import('./check.mjs');
const attendre = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

await checkAllAgents();
check('l agent local est d abord hors service', unavailableBots().length === 1);

const msgs = [];
enqueue('h1', (m) => msgs.push(m), () => {});
await attendre(200);
check('tant qu il est hors service, rien n est annonce', !msgs.some((m) => m.type === 'agentsDown'));

enLigne = true;
await attendre(200);
const annonce = msgs.filter((m) => m.type === 'agentsDown').at(-1);
check('le joueur en file apprend que l agent est revenu', annonce?.agents.length === 0);
check('le rapport de sante est a jour', unavailableBots().length === 0);
check('le modele local est recharge une seule fois', prechauffages === 1);
check('le lobby rediffuse son etat', msgs.at(-1)?.type === 'state');

report();
