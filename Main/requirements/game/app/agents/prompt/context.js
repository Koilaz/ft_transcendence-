//La matiere commune a tous les prompts : l'etat de la partie et la mise en
//forme du transcript. Ce n'est pas du style d'ecriture mais de l'information,
//la meme quel que soit le modele qui la lit. Chaque prompt choisit ensuite ce
//qu'il en garde, sans avoir a recopier le texte des blocs qu'il conserve.

//Une ligne par message, prefixee du personnage qui l'a envoye.
export function buildRawTranscript(history)
{
	if (!history || history.length === 0)
		return '';

	return history.map((m) => `${m.sender}: ${m.text}`).join('\n');
}

//Le meme, delimite. Les balises marquent de la donnee et non des consignes : ce
//qui est dedans a ete ecrit par les joueurs, le modele l'observe et n'y obeit
//pas.
//Rien sur un historique vide, c'est la consigne d'ouverture qui prend le relais.
export function buildTranscript(history)
{
	const lines = buildRawTranscript(history);
	if (!lines)
		return '';

	return `voici l'historique de conversation complet:\n<conversation>\n${lines}\n</conversation>`;
}

//L'heure est lue une fois par manche et non a chaque tour. Le contexte fait
//partie du prefixe stable du prompt (voir agents/ollama_local.js) : une horloge
//qui avance invaliderait le cache KV a chaque appel, et le bot paierait
//plusieurs centaines de tokens de prefill pour gagner des secondes qu'il
//n'utilise pas.
const roundClock = new WeakMap();

function clockOf(round)
{
	let clock = roundClock.get(round);
	if (!clock)
	{
		const now = new Date();
		clock =
		{
			date: now.toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' }),
			time: now.toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' }),
		};
		roundClock.set(round, clock);
	}

	return clock;
}

//Les blocs de contexte disponibles. La portee appartient au bloc et non au
//prompt qui le choisit : `shared` vaut pour tous les bots de la manche et se
//place avant le transcript, `perBot` change d'un bot a l'autre. C'est cette
//portee qui decide de la position du texte dans le prompt d'ollama, donc du
//cache KV — un bloc range dans la mauvaise moitie coute des dizaines de
//secondes de prefill par tour.
export const contextParts =
{
	playersCount:
	{
		scope: 'shared',
		build: (room) => `il y'a ${room.numberOfPlayer} joueur dans cette partie.`,
	},

	//publicTurnOrder() rend deja les personnages dans l'ordre de jeu : il suffit
	//de le dire. Numerote et sur une ligne chacun, parce qu'une enumeration
	//separee par des virgules se lit comme une liste sans ordre.
	speakingOrder:
	{
		scope: 'shared',
		build: (room) =>
		{
			const order = room.currentRound.publicTurnOrder()
				.map((c, i) => `${i + 1}. ${c}`)
				.join('\n');

			return `les personnages de cette manche prennent la parole chacun leur tour, toujours dans cet ordre :
${order}
apres le dernier on revient au premier, et ainsi de suite jusqu'a la fin de la manche.
c'est uniquement le nom par lequel les autres joueurs sont designe aleatoirement.
tu peux l'utiliser pour t'adresser a eux`;
		},
	},

	roundNumber:
	{
		scope: 'shared',
		build: (room) => `Nous sommes au round ${room.roundNumber}.`,
	},

	character:
	{
		scope: 'perBot',
		build: (room, botId) => `le nom de ton personnage lors de cette manche est ${room.currentRound.caracterOf(botId)}.
c'est uniquement le nom par lequel les autres joueurs t'apelle,
reponds en particulier au message qui semble s'adresser a ce personage
ca ne definis pas qui tu es vraiment, ni ta personalite`,
	},

	clock:
	{
		scope: 'perBot',
		build: (room) =>
		{
			const { date, time } = clockOf(room.currentRound);
			return `Nous sommes le ${date}, il est ${time}.`;
		},
	},
};

//Un element de la liste est soit une cle du registre, soit un bloc ecrit sur
//place `{ scope, build }` — de quoi reformuler une information pour un modele
//particulier sans toucher aux autres prompts.
function resolvePart(part)
{
	const block = typeof part === 'string' ? contextParts[part] : part;
	if (typeof block?.build !== 'function')
	{
		throw new Error(`bloc de contexte inconnu "${part}"`
			+ ` — blocs disponibles : ${Object.keys(contextParts).join(', ')}`);
	}

	return block;
}

//Rend une fonction (room, botId) => { shared, perBot } : la signature attendue
//par game/bot.js et game/room.js, quelle que soit la selection.
//La resolution est immediate, au chargement du module : une cle mal orthographiee
//devient une erreur d'import et non un bot muet en pleine partie.
export function composeContext(parts)
{
	const blocks = parts.map(resolvePart);

	return (room, botId) =>
	{
		const shared = [];
		const perBot = [];

		for (const block of blocks)
		{
			const text = block.build(room, botId);
			if (!text)
				continue;
			(block.scope === 'perBot' ? perBot : shared).push(text);
		}

		return { shared: shared.join('\n'), perBot: perBot.join('\n') };
	};
}

//Le contexte au complet, pour un prompt qui n'a rien a retrancher.
export const buildContextPrompt = composeContext(Object.keys(contextParts));
