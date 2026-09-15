import { createHmac, timingSafeEqual } from 'node:crypto';

/*
#TODO cours JWT : a relire puis a supprimer une fois compris

1. Ce qu'est un JWT
   Une chaine en trois morceaux separes par des points :
       header.payload.signature
   Chaque morceau est encode en base64url (du base64 sans + / = pour tenir
   dans une URL). ENCODE ne veut pas dire CHIFFRE : n'importe qui peut coller
   un token sur jwt.io et lire son contenu. On n'y met donc jamais de secret.

   - header    {"alg":"HS256","typ":"JWT"}  l'algorithme de signature
   - payload   {"sub":7,"username":"leo","iat":1757930000,"exp":1757933600}
               les "claims" : sub = id de l'utilisateur, iat = date
               d'emission, exp = date d'expiration, en SECONDES depuis 1970
   - signature HMAC-SHA256("header.payload", secret)

2. Pourquoi la signature suffit
   HMAC est une empreinte qui depend du texte ET d'un secret. Sans le secret,
   impossible de produire la bonne signature. Changer une seule lettre du
   payload (sub: 7 -> sub: 1) donne une signature completement differente.
   Donc : signature correcte = token emis par quelqu'un qui connait le secret
   (notre backend) ET contenu intact.
   HS256 est symetrique : le meme secret sert a signer et a verifier. C'est
   pour ca que le backend et le jeu montent tous les deux jwt_secret.txt.

3. Le trajet dans ce projet
   a. Login : le backend verifie email + mot de passe, puis signe un token
      { sub, username } valable 1h (auth.service.ts, auth.module.ts).
   b. Le front le range dans localStorage.accessToken (Login.tsx).
   c. Appels REST : envoye dans le header "Authorization: Bearer <token>".
   d. WebSocket : l'API WebSocket du navigateur ne permet pas d'ajouter de
      header, il part donc dans l'URL : /ws/game?token=<token>
      (gameSocket.ts). nginx le masque dans ses logs (nginx.conf), sinon
      access.log contiendrait des tokens rejouables.
   e. Ici, a l'ouverture de la socket, verifyToken recalcule la signature avec
      le meme secret (lu par tools/entrypoint.sh) et la compare. Aucun appel
      au backend ni a la base : c'est tout l'interet d'un token "stateless".

4. Les verifications, et le piege que chacune evite
   - timingSafeEqual au lieu de === : une comparaison normale s'arrete au
     premier octet different. En mesurant le temps de reponse, un attaquant
     peut deviner la signature octet par octet. timingSafeEqual prend
     toujours le meme temps.
   - alg === 'HS256' : attaque classique, un token forge avec "alg":"none"
     et une signature vide, que certaines bibliotheques acceptaient. Ici on
     calcule toujours HS256 quoi que dise le header, donc sans risque, mais
     on refuse explicitement ce qu'on n'a pas emis.
   - exp : sans ce controle, un token vole resterait valable pour toujours.

5. Limites a connaitre
   - Pas de revocation : un token vole reste valide jusqu'a exp. Le logout
     efface seulement la copie du navigateur.
   - Le username est fige a la connexion : apres un changement de pseudo
     dans le profil, le token porte l'ancien jusqu'au prochain login.
   - Un token expire ne bloque pas le jeu : le joueur entre en invite.

6. Pourquoi pas la bibliotheque jsonwebtoken
   Verifier du HS256 tient en une vingtaine de lignes avec node:crypto : pas
   de dependance a installer ni a maintenir pour si peu.
*/

//Le jeu n'exige aucun compte : un token absent, invalide ou expire ne bloque
//rien, le joueur entre simplement en invite.
const secret = process.env.JWT_SECRET;
if (!secret)
	console.warn('[auth] JWT_SECRET absent : tous les joueurs entreront en invite');

function decodePart(part)
{
	return JSON.parse(Buffer.from(part, 'base64url').toString());
}

//Renvoie { userId, username } pour un token valide, null sinon.
export function verifyToken(token)
{
	if (!secret || typeof token !== 'string')
		return null;
	const [header, payload, signature] = token.split('.');
	if (!signature)
		return null;

	const expected = createHmac('sha256', secret).update(`${header}.${payload}`).digest();
	const received = Buffer.from(signature, 'base64url');
	if (received.length !== expected.length || !timingSafeEqual(received, expected))
		return null;

	try
	{
		const { alg } = decodePart(header);
		const { sub, username, exp } = decodePart(payload);
		if (alg !== 'HS256' || !Number.isInteger(sub) || typeof exp !== 'number')
			return null;
		if (exp * 1000 <= Date.now())
			return null;
		return { userId: sub, username };
	}
	catch
	{
		return null;
	}
}
