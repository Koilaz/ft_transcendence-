// Post traitement des reponses des bots

const KEYBOARD_ROWS = [
	{ offset: 0.00, keys: 'qwertyuiop' },
	{ offset: 0.25, keys: 'asdfghjkl' },
	{ offset: 0.75, keys: 'zxcvbnm' },
];

const TYPO_RATE = 0.003;         // probabilite qu'une lettre donnee soit ratee
const MAX_SWAPS_PER_MESSAGE = 2; // au dela ce n'est plus une faute de frappe

const MISS_RATE = 0.002;            // probabilite de ne pas enfoncer une touche
const MAX_MISSES_PER_MESSAGE = 1;

// Lettres qui se doublent
const FRENCH_DOUBLES = new Set('bcdefglmnoprstz');

const KEYBOARD_NEIGHBORS = buildNeighbors();

export function postTreatment(reply)
{
	if (typeof reply !== 'string')
		return reply;
	let text = randomSwap(reply);
	text = randomMiss(text);
	return text;
}

// Mise en forme commune a tous les messages du chat, humains comme bots (voir
// Room.addMessage) : si seul le bot etait normalise, un "AAAAH" ou un accent
// suffirait a reconnaitre un humain.
export function normalizeMessage(text)
{
	return trimRepeats(keepPlainChars(normalizeCase(text))).trim();
}

function buildNeighbors()
{
	const keys = [];
	KEYBOARD_ROWS.forEach((row, y) =>
	{
		for (let i = 0; i < row.keys.length; i++)
			keys.push({ char: row.keys[i], x: row.offset + i, y });
	});

	const neighbors = {};
	for (const key of keys)
	{
		const list = [];
		for (const other of keys)
		{
			const dx = Math.abs(other.x - key.x);
			const dy = Math.abs(other.y - key.y);
			if (dy === 0 && dx > 0 && dx <= 1.1)
				list.push(other.char, other.char, other.char);// meme rangee : x3
			else if (dy === 1 && dx <= 1)
				list.push(other.char);// rangee du dessus ou du dessous
		}
		neighbors[key.char] = list;
	}
	return neighbors;
}

// Tout en minuscules et sans accents
export function normalizeCase(text)
{
	return text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
}

// Ne garde que ce qui se tape sans chercher sur un clavier : lettres minuscules,
// chiffres, ponctuation courante et + - * / ( ) = %. Emojis et symboles
// disparaissent, un retour a la ligne devient un espace. L'apostrophe courbe et
// le œ des LLM sont ramenes a leur version clavier plutot que supprimes.
export function keepPlainChars(text)
{
	return text
		.replace(/\s/g, ' ')
		.replace(/’/g, "'")
		.replace(/œ/g, 'oe')
		.replace(/[^a-z0-9 .,;:!?'"+\-*/()=%]/g, '');
}

// Ecrase les caracteres repetes "aaaa     bbbbbb" => "a b"

export function trimRepeats(text)
{
	return text.replace(/([^\d.])\1+/gu, (run, char) =>
		run.length === 2 && FRENCH_DOUBLES.has(char) ? run : char);
}

// Remplace de temps en temps une lettre par une touche voisine du clavier.
// Seules les minuscules sont touchees.
export function randomSwap(text, rate = TYPO_RATE, maxSwaps = MAX_SWAPS_PER_MESSAGE)
{
	const chars = [...text];
	let swaps = 0;

	for (let i = 0; i < chars.length && swaps < maxSwaps; i++)
	{
		const choices = KEYBOARD_NEIGHBORS[chars[i]];
		if (!choices || Math.random() >= rate)
			continue;// majuscule, chiffre, ponctuation, accent, espace : on ne touche pas
		chars[i] = choices[Math.floor(Math.random() * choices.length)];
		swaps++;
	}
	return chars.join('');
}

// Enleve de temps en temps une lettre : la touche n'a pas ete enfoncee assez fort.
export function randomMiss(text, rate = MISS_RATE, maxMisses = MAX_MISSES_PER_MESSAGE)
{
	const out = [];
	let misses = 0;

	for (const char of text)
	{
		if (misses < maxMisses && KEYBOARD_NEIGHBORS[char] && Math.random() < rate)
		{
			misses++;
			continue;
		}
		out.push(char);
	}
	return out.join('');
}
