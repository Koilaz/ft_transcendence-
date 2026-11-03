// Un joueur qui entre en file doit apprendre tout de suite que les bots sont
// revenus : la premiere sonde part a l'arrivee du joueur, pas apres
// agentRecheckDelay. Sinon, seul devant une file vide, il restait devant
// « API non joignable » sans que rien ne re-sonde : le recheck periodique ne
// tourne qu'a cote d'une sonde deja programme, et le filet de boot s'epuise.
import { gameConfig } from '../game/config.js';

// Aucun appel reseau : sans cle, les agents Mistral repondent no_key tout de
// suite, et l'agent local est remplace par un faux plus bas.
delete process.env.MISTRAL_API_KEY;
gameConfig.bots = ['local_agent'];
// Assez long pour prouver que l'annonce ne vient pas du timer periodique :
// 30 s, contre 200 ms d'attente dans ce test.
gameConfig.agentRecheckDelay = 30;

const { local_agent } = await import('../agents/ollama_local.js');
let prechauffages = 0;
// Deux sondes seulement : le boot voit l'agent down, l'arrivee du joueur le
// voit revenu. Une troisieme, si elle arrive, ne ferait que confirmer.
const sante = [{ ok: false, reason: 'timeout', detail: 'hors service' }];
local_agent.healthCheck = async () => sante.shift() ?? { ok: true, detail: 'de retour' };
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
const annonce = msgs.filter((m) => m.type === 'agentsDown').at(-1);
check('le joueur apprend le retour sans attendre le timer', annonce?.agents.length === 0);
check('le rapport de sante est a jour', unavailableBots().length === 0);
check('le modele local est recharge', prechauffages === 1);

report();
