// Verification des JWT du backend par le service de jeu.
import { createHmac } from 'node:crypto';

// auth.js lit le secret au chargement : il doit exister avant l'import.
process.env.JWT_SECRET = 'secret-de-test';
const { verifyToken } = await import('../auth.js');
const { check, report } = await import('./check.mjs');

// Signe un token HS256, comme le backend
function sign(payload, secret = 'secret-de-test')
{
	const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
	const data = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}`;
	return `${data}.${createHmac('sha256', secret).update(data).digest('base64url')}`;
}

const exp = Math.floor(Date.now() / 1000) + 3600;

check('token valide accepte', verifyToken(sign({ sub: 7, username: 'leo', exp }))?.username === 'leo');
check('mauvais secret refuse', verifyToken(sign({ sub: 7, username: 'leo', exp }, 'autre')) === null);
check('token expire refuse', verifyToken(sign({ sub: 7, username: 'leo', exp: 1 })) === null);
check('texte quelconque refuse', verifyToken('pas-un-jwt') === null);

report();
