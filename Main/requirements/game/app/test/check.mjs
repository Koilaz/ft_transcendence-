// Micro-assertions partagees par les fichiers de test. Volontairement minimal :
// pas de dependance, pas de framework, `node test/xxx.test.mjs` suffit.
let failures = 0;

export function check(label, condition)
{
	console.log(`${condition ? 'OK  ' : 'FAIL'} ${label}`);
	if (!condition)
		failures++;
}

export function report()
{
	console.log(failures === 0
		? '\n=> TOUS LES TESTS PASSENT'
		: `\n=> ${failures} ECHEC(S)`);
	process.exitCode = failures === 0 ? 0 : 1;
}
