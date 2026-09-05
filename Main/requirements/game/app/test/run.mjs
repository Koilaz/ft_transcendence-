// Lance tous les *.test.mjs du dossier et resume.
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const files = readdirSync(here).filter((f) => f.endsWith('.test.mjs')).sort();

let failed = 0;
for (const file of files)
{
	console.log(`\n===== ${file} =====`);
	//Le timeout n'est pas qu'une securite : un test qui ne rend pas la main
	//signale un setInterval non nettoye. Sortir tout seul fait partie du
	//contrat verifie.
	const res = spawnSync(process.execPath, [join(here, file)],
						  { stdio: 'inherit', timeout: 30000 });
	if (res.status !== 0)
	{
		failed++;
		if (res.signal)
			console.log(`(interrompu : ${res.signal} - un timer fuit probablement)`);
	}
}

console.log(`\n${files.length - failed}/${files.length} fichiers passent`);
process.exit(failed === 0 ? 0 : 1);
