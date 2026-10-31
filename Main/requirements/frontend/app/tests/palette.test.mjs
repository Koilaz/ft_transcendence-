import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// La palette du design system (src/index.css, bloc @theme) doit rester une copie
// verbatim des shades Tailwind correspondantes : un token edite a la main ferait
// deriver la couleur de tout ce qui l'utilise. Ce test verifie l'egalite avec le
// theme.css du tailwindcss reellement installe (meme version que le build).
//
// Deux couches volontairement decouplees : les tokens SEMANTIQUES (abyss, azur,
// danger, success, warning) pour l'UI, et les tokens PERSONNAGES (ketchup,
// moutarde, wasabi, poivre, cocktail) pour l'identite du jeu. Ils partagent les
// memes shades Tailwind aujourd'hui, mais chaque couche peut diverger ensuite :
// le test ne verifie l'egalite qu'avec la shade source, jamais entre couches.
// Si une divergence est voulue (ex. changer la couleur d'un personnage),
// mettre a jour MAPPING ou retirer l'entree concernee ici.

const MAPPING = {
	abyss: 'stone',
	azur: 'blue',
	danger: 'red',
	success: 'emerald',
	warning: 'amber',
	ketchup: 'red',
	moutarde: 'amber',
	wasabi: 'emerald',
	poivre: 'violet',
};

// Le Marechal Cocktail porte l'accent azur sous son propre nom : les deux
// familles doivent rester identiques, sinon le personnage change de couleur.
const ALIASES = {
	'cocktail-400': 'azur-400',
	'cocktail-700': 'azur-700',
};

function parseTheme(css)
{
	const values = {};
	for (const line of css.split('\n'))
	{
		const m = line.match(/^\s*--color-([a-z]+)-(\d+):\s*(.+?);\s*$/);
		if (m)
			values[`${m[1]}-${m[2]}`] = m[3];
	}
	return values;
}

const ours = parseTheme(readFileSync(new URL('../src/index.css', import.meta.url), 'utf-8'));
const tailwind = parseTheme(readFileSync(new URL('../node_modules/tailwindcss/theme.css', import.meta.url), 'utf-8'));

test('chaque token de la palette vaut exactement sa shade Tailwind source', () => {
	for (const [token, source] of Object.entries(MAPPING))
	{
		const shades = Object.keys(ours)
			.filter((key) => key.startsWith(`${token}-`))
			.map((key) => key.slice(token.length + 1));
		assert.ok(shades.length > 0, `aucun token --color-${token}-* dans index.css`);

		for (const shade of shades)
		{
			assert.ok(
				ours[`${token}-${shade}`] === tailwind[`${source}-${shade}`],
				`--color-${token}-${shade} (${ours[`${token}-${shade}`] ?? 'absent'})`
					+ ` != --color-${source}-${shade} (${tailwind[`${source}-${shade}`] ?? 'absent'})`,
			);
		}
	}
});

test('les alias cocktail restent identiques a azur', () => {
	for (const [alias, target] of Object.entries(ALIASES))
	{
		assert.ok(alias in ours, `--color-${alias} absent de index.css`);
		assert.ok(target in ours, `--color-${target} absent de index.css`);
		assert.strictEqual(ours[alias], ours[target], `--color-${alias} a derive de --color-${target}`);
	}
});
