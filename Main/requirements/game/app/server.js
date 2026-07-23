
import express from 'express';
import http from 'node:http';
import { WebSocketServer } from 'ws';
import { Room, findOrCreateRoom } from './game/room.js';

const app = express();
app.use(express.static('public'));//#tmp
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
let nextPlayerId = 1;   // compteur global provisoire pour nommer les joueurs

wss.on('connection', (socket) =>
{
	//  inscription
	const room = findOrCreateRoom();
	const playerId = `joueur-${nextPlayerId++}`;//#tmp utiliser vrai ID

	const sendFn = function(msg)
	{
		if (socket.readyState === socket.OPEN)
			socket.send(JSON.stringify(msg));
	};
	room.addPlayer(playerId, sendFn); // on accroche les infos sur la socket pour les retrouver dans les autres handlers
	socket.playerId = playerId;
	socket.room = room;
	console.log(`${playerId} connecté → ${room.id}`);
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
		if (msg.type !== 'chat')
		{
			console.log('not a chat message') //temporaire #tmp
			return
		}
		socket.room.addMessage(socket.playerId, msg.text)
	});

	//3. départ
	socket.on('close', () =>
	{
		socket.room.removePlayer(socket.playerId);
	});
});
server.listen(3000, () => console.log('serveur sur :3000'));

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
