
import express from 'express';
import http from 'node:http';
import { WebSocketServer } from 'ws';
import { enqueue, dequeue, ready } from './game/queue.js';
import { checkAllAgents, unavailableBots } from './agents/index_agent.js';
import { warmupOllama } from './agents/ollama_local.js';
import { verifyToken } from './auth.js';

const MAX_CHAT_LENGTH = 500;
const HEARTBEAT_MS = 30000;

const app = express();
app.use(express.static('public'));//#tmp
const server = http.createServer(app);
//maxPayload : ws accepte 100 Mio par defaut, bien plus qu'un message de chat
const wss = new WebSocketServer({ server, path: '/ws/game', maxPayload: 16 * 1024 });
let nextPlayerId = 1;   // compteur global provisoire pour nommer les joueurs

//Pseudo choisi par un invite. C'est une entree non fiable : on borne la
//longueur et on retire les caracteres de controle, qui pollueraient les logs et
//l'affichage.
//Purement decoratif : il ne sert qu'au classement final, jamais a identifier
//un joueur cote serveur.
function cleanDisplayName(raw)
{
	if (!raw)
		return null;
	return raw.replace(/\p{C}/gu, '').trim().slice(0, 20) || null;
}

wss.on('connection', (socket, request) =>
{
	//  inscription : on entre dans la file d'attente, pas dans une room. La room
	//  ne nait que lorsqu'un groupe complet peut etre forme (voir queue.js).
	//  playerId reste interne meme pour un joueur connecte : le meme compte
	//  ouvert dans deux onglets ne doit pas entrer en collision dans les Map.
	const playerId = `joueur-${nextPlayerId++}`;

	//Un joueur connecte prend le pseudo de son compte, signe par le backend.
	//Sans token valide, il est traite comme un invite.
	const params = new URL(request.url, 'http://placeholder').searchParams;
	const user = verifyToken(params.get('token'));
	const displayName = user?.username ?? cleanDisplayName(params.get('name'));
	socket.userId = user?.userId ?? null;

	//Sans ecouteur, une trame invalide emise en 'error' ferait tomber le
	//process, et toutes les parties avec. 'close' suit et fait le menage.
	socket.on('error', (err) => console.error(`[ws] ${playerId} :`, err.message));

	socket.isAlive = true;
	socket.on('pong', () => { socket.isAlive = true; });

	const sendFn = function(msg)
	{
		//La room ferme : le joueur quitte la partie mais garde sa socket. On ne
		//le remet PAS dans la file tout seul, sinon il serait catapulte dans une
		//nouvelle partie sans avoir eu le temps de lire le classement. C'est le
		//bouton « Rejouer » du front qui enverra `replay`.
		if (msg.type === 'roomClosed')
			socket.room = null;
		if (socket.readyState === socket.OPEN)
			socket.send(JSON.stringify(msg));
	};

	const joinRoom = function(room)
	{
		socket.room = room;
		console.log(`${playerId} → room ${room.id}`);
	};

	socket.playerId = playerId;
	socket.room = null;   // null tant qu'il patiente dans la file

	//Avant la file, pas apres : le joueur doit savoir qu'il attend une partie
	//sans imposteur pendant qu'il attend, pas une fois la partie finie. Le
	//rapport date du demarrage, il ne coute rien a relire ici.
	const brokenAgents = unavailableBots();
	if (brokenAgents.length)
		sendFn({ type: 'agentsDown', agents: brokenAgents });

	enqueue(playerId, sendFn, joinRoom, displayName);
	console.log(`${playerId} (${displayName ?? 'anonyme'}${user ? `, compte ${user.userId}` : ''}) connecté → file d'attente`);
	//2. messages entrants
	socket.on('message', (data) =>
	{
		let msg;
		try
		{
			msg = JSON.parse(data.toString());
		}
		catch(error)
		{
			console.error('message non-JSON ignoré:', error.message);
			return;
		}
		//'null' est du JSON valide : msg.type ferait tomber le process
		if (!msg || typeof msg !== 'object')
			return;
		//Seul message accepte hors partie : il remet le joueur dans la file, a
		//son initiative.
		if (msg.type === 'replay')
		{
			if (!socket.room)
				enqueue(playerId, sendFn, joinRoom, displayName);
			return;
		}

		//Tant que le joueur patiente dans la file, il n'a rien a dire ni a voter :
		//le lobby ne permet aucune communication entre joueurs.
		if (!socket.room)
		{
			if (msg.type === 'ready')
				ready(playerId);
			return;
		}

		if (msg.type === 'chat')
		{
			//Le texte finit dans l'historique et dans le prompt des bots
			if (typeof msg.text !== 'string')
				return;
			const text = msg.text.trim().slice(0, MAX_CHAT_LENGTH);
			if (text)
				socket.room.addMessage(socket.playerId, text);
		}
		/* Ajoute systeme de vote */
		else if (msg.type === 'vote')
		{
			if (msg.targetCharacter)
			{
				socket.room.submitVote(socket.playerId, msg.targetCharacter);
				console.log(`[vote] ${socket.playerId} a voté pour ${msg.targetCharacter}`);
			}
		}
		else
		{
			console.log(`[ws] type de message non géré : ${msg.type}`);
		}
	});

	//3. départ
	socket.on('close', () =>
	{
		if (socket.room)
			socket.room.removePlayer(socket.playerId);
		else
			dequeue(socket.playerId);
	});
});

//Une connexion coupee sans fermeture propre (veille, wifi perdu) n'emet pas
//'close' avant longtemps : le joueur fantome resterait compte dans la file ou
//dans sa room. Le navigateur repond seul aux ping ; sans pong depuis le tour
//precedent, on coupe, et 'close' retire le joueur.
setInterval(() =>
{
	for (const client of wss.clients)
	{
		if (!client.isAlive)
		{
			client.terminate();
			continue;
		}
		client.isAlive = false;
		client.ping();
	}
}, HEARTBEAT_MS);
//etat des agents avant d'accepter des connexions : rapide, aucun token consomme
await checkAllAgents();

server.listen(3000, () => console.log('serveur sur :3000'));

//prechargement du modele local : lent, on ne bloque pas le demarrage
warmupOllama().catch((err) => console.error('[ollama] prechargement echoue :', err.message));

/*
wss.on('connection', (socket) =>
{
	console.log('client connecté');

	socket.on('message', (data) =>
	{
	for(const client of wss.clients)
	{
		const text = data.toString();
		if(client.readyState === client.OPEN)
		{
			client.send(text);
		}
	}
	});

	socket.on('close', () => console.log('client déconnecté'));
});

server.listen(3000, () => console.log('serveur sur :3000'));


function broadcast(message, room_id)
{
	const payload = JSON.stringify(message);
	for (const client of wss.clients)
	{
		if (client.readyState === client.OPEN)
			client.send(payload);
	}
}*/
