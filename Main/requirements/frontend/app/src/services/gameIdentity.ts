// La garde de /game : un invite qui deep-link sans jamais etre passe par
// l'accueil n'a ni jeton ni pseudo — le serveur l'accepterait sous son pseudo
// par defaut « joueur-N », mais il merite mieux. La porte ne porte que sur
// l'identite, pas sur le chemin : un refresh en pleine partie doit continuer
// a reprendre la session (resumeToken, voir services/gameSocket.ts), et les
// urls de /game doivent rester partageables.
export function hasGameIdentity(storage: Pick<Storage, 'getItem'>): boolean
{
	return Boolean(storage.getItem('accessToken') || storage.getItem('guestName'));
}
