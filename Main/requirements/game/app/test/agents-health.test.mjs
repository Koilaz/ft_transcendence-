// unavailableBots() prend son rapport en argument : c'est ce qui la rend
// testable sans reseau, alors que les healthChecks eux-memes appellent Mistral
// et ollama. On lui injecte un rapport ecrit a la main.
import { unavailableBots } from '../agents/index.js';
import { check, report } from './check.mjs';

const rapport = new Map(
[
	['mistral_small', { name: 'mistral_small', ok: true, detail: 'mistral-small-latest disponible' }],
	['mistral_medium', { name: 'mistral_medium', ok: false, reason: 'no_allowance',
		detail: '429 sur /v1/chat/completions — x-ratelimit-limit-req-minute=0' }],
]);

const sain = unavailableBots(['mistral_small'], rapport);
check('un agent qui a passe son healthCheck ne remonte pas', sain.length === 0);

const casse = unavailableBots(['mistral_medium'], rapport);
check('un agent KO remonte', casse.length === 1);
check('avec la raison machine attendue par le front', casse[0]?.reason === 'no_allowance');
check('et le detail technique intact', casse[0]?.detail.includes('limit-req-minute=0'));

const inconnu = unavailableBots(['mistral_xxl'], rapport);
check('un nom absent du registre remonte aussi', inconnu.length === 1);
check('sous une raison distincte', inconnu[0]?.reason === 'unknown_agent');

const doublon = unavailableBots(['mistral_medium', 'mistral_medium'], rapport);
check('le meme bot liste deux fois n avertit qu une fois', doublon.length === 1);

const melange = unavailableBots(['mistral_small', 'mistral_medium'], rapport);
check('seul le bot casse est signale', melange.length === 1 && melange[0].name === 'mistral_medium');

report();
