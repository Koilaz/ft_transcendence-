// Post traitement des reponses des bots : un LLM ecrit trop proprement pour
// passer pour un humain. On repasse derriere lui pour y glisser les petits
// defauts d'une vraie frappe (touche voisine tapee par erreur, etc.).

// Disposition physique d'un clavier QWERTY US. Chaque rangee est decalee vers
// la droite comme sur un vrai clavier : c'est ce decalage qui donne les bons
// voisins en diagonale (sous le f il y a c et v, pas seulement v).
const KEYBOARD_ROWS = [
	{ offset: 0.00, keys: 'qwertyuiop' },
	{ offset: 0.25, keys: 'asdfghjkl' },
	{ offset: 0.75, keys: 'zxcvbnm' },
];

const TYPO_RATE = 0.003;         // probabilite qu'une lettre donnee soit ratee
const MAX_SWAPS_PER_MESSAGE = 2; // au dela ce n'est plus une faute de frappe

const MISS_RATE = 0.002;            // probabilite de ne pas enfoncer une touche
const MAX_MISSES_PER_MESSAGE = 1;

// Lettres qui se doublent en francais (ou dans les emprunts courants) :
// abbe, accord, addition, meeting, effet, aggraver, aller, comme, donner,
// zoo, appel, terre, assez, attendre, pizza.
const FRENCH_DOUBLES = new Set('bcdefglmnoprstz');

// Table des voisins : { f: ['d','d','d','g','g','g','r','t','c','v'], ... }
// Les voisins de la meme rangee sont repetes 3 fois : le doigt derape a cote
// plus souvent qu'il ne tape la rangee du dessus ou du dessous.
const KEYBOARD_NEIGHBORS = buildNeighbors();
// Point d'entree unique : tout ce qui doit passer par dessus la reponse brute
// de l'agent se branche ici (voir les #TODO en bas de bot.js).

export function postTreatment(reply)
{
	if (typeof reply !== 'string')
		return reply;
	let text = normalizeCase(reply);
	text = trimRepeats(text);
	text = randomSwap(text);
	text = randomMiss(text);
	return text;
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

// Tout en minuscules et sans accents : personne ne tape "Évidemment" dans un
// chat, et ca ouvre toutes les lettres aux fautes de frappe qui suivent.
export function normalizeCase(text)
{
	return text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
}

// Ecrase les caracteres repetes ("mdrrrr", "ouiiii", doubles espaces) : un bot
// n'ecrit jamais comme ca et ca le trahit. Un double qui existe en francais
// ("ss", "ll"...) est garde, au dela de deux on revient toujours a un seul.
// Les chiffres (100, 2000) et les points de suspension ne sont pas touches.
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
