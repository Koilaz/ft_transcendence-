
import express from 'express';
import http from 'node:http';
import { WebSocketServer } from 'ws';
import { enqueue, dequeue, ready } from './game/queue.js';
import { checkAllAgents, unavailableBots } from './agents/index_agent.js';
import { warmupOllama } from './agents/ollama_local.js';
import { verifyToken } from './auth.js';
import { attachGameConnections } from './gameConnections.js';

const app = express();
app.use(express.static('public'));//#tmp
const server = http.createServer(app);
//maxPayload : ws accepte 100 Mio par defaut, bien plus qu'un message de chat
const wss = new WebSocketServer({ server, path: '/ws/game', maxPayload: 16 * 1024 });
attachGameConnections(wss, { enqueue, dequeue, ready, verifyToken, unavailableBots });

//etat des agents avant d'accepter des connexions : rapide, aucun token consomme
await checkAllAgents();

server.listen(3000, () => console.log('serveur sur :3000'));

//prechargement du modele local : lent, on ne bloque pas le demarrage
warmupOllama().catch((err) => console.error('[ollama] prechargement echoue :', err.message));
