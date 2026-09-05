
import express from 'express';
import http from 'node:http';
import { WebSocketServer } from 'ws';
import { enqueue, dequeue } from './game/queue.js';
import { checkAllAgents } from './agents/index.js';
import { warmupOllama } from './agents/ollama_local.js';

const app = express();
app.use(express.static('public'));//#tmp
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/game' });
let nextPlayerId = 1;   // compteur global provisoire pour nommer les joueurs

//Pseudo choisi par le joueur, transmis en query param a l'ouverture de la
//socket. C'est une entree non fiable : on borne la longueur et on retire les
//caracteres de controle, qui pollueraient les logs et l'affichage.
//Purement decoratif : il ne sert qu'au classement final, jamais a identifier
//un joueur cote serveur.
function readDisplayName(request)
{
	const raw = new URL(request.url, 'http://placeholder').searchParams.get('name');
	if (!raw)
		return null;
	return raw.replace(/\p{C}/gu, '').trim().slice(0, 20) || null;
}

wss.on('connection', (socket, request) =>
{
	//  inscription : on entre dans la file d'attente, pas dans une room. La room
	//  ne nait que lorsqu'un groupe complet peut etre forme (voir queue.js).
	const playerId = `joueur-${nextPlayerId++}`;//#tmp utiliser vrai ID

	const displayName = readDisplayName(request);

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
	enqueue(playerId, sendFn, joinRoom, displayName);
	console.log(`${playerId} (${displayName ?? 'anonyme'}) connecté → file d'attente`);
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
			return;

		if (msg.type === 'chat')
		{
			socket.room.addMessage(socket.playerId, msg.text);
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
