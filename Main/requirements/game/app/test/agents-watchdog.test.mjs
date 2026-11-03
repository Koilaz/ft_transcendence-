// Un healthCheck muet ne doit plus emporter la mecanique entiere : la promesse
// zombie figeait boot, filet et re-check de file jusqu'au redemarrage du
// conteneur (constate en production : les agents restaient KO alors que le
// fetch repondait dans le meme processus). Le watchdog tranche, et la file
// finit par annoncer le retour.
import { gameConfig } from '../game/config.js';

// Aucun appel reseau : la cle absente met les agents Mistral KO tout de
// suite, et l'agent local est remplace par un faux muet plus bas.
delete process.env.MISTRAL_API_KEY;
process.env.HEALTHCHECK_WATCHDOG_MS = 50;	//montre courte pour le test
gameConfig.bots = ['local_agent'];
gameConfig.agentRecheckDelay = 0.05;

const { local_agent } = await import('../agents/ollama_local.js');
let muet = true;
let sondes = 0;
local_agent.healthCheck = () =>
{
	sondes++;
	return muet ? new Promise(() => {}) : Promise.resolve({ ok: true, detail: 'de retour' });
};
local_agent.warmup = async () => {};

const { boundedHealthCheck, checkAllAgents, unavailableBots } = await import('../agents/index_agent.js');
const { enqueue } = await import('../game/queue.js');
const { check, report } = await import('./check.mjs');
const attendre = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const borne = await boundedHealthCheck(local_agent);
check('un healthCheck muet rend la main en echec de timeout', borne.reason === 'timeout');
check('la montre tranche sans consommer la sonde', sondes === 1);

await checkAllAgents();
check('le boot ne reste pas coince sur un agent muet', unavailableBots().length === 1);

const msgs = [];
enqueue('h1', (m) => msgs.push(m), () => {});
await attendre(300);
check('le re-check periodique survit au zombie', sondes >= 2);

muet = false;
await attendre(300);
const annonce = msgs.filter((m) => m.type === 'agentsDown').at(-1);
check('l agent revenu est annonce malgre le zombie passe', annonce?.agents.length === 0);
check('et le rapport de sante est a jour', unavailableBots().length === 0);

report();
