
import express from 'express';
import http from 'node:http';
import { WebSocketServer } from 'ws';
import { enqueue, dequeue, ready } from './game/queue.js';
import { checkAllAgents, recheckDownAgents, unavailableBots } from './agents/index_agent.js';
import { warmupOllama } from './agents/ollama_local.js';
import { verifyToken } from './auth.js';
import { attachGameConnections } from './gameConnections.js';

const app = express();

// Health check du frontend (gameSocket.ts : waitForGameServer) : repondre
// 204 en HTTP simple evite « Failed to load resource: 404 » dans la console
// du navigateur. Les upgrades WebSocket passent par ws, pas par Express.
app.get('/ws/game', (req, res) => res.status(204).end());
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/game', maxPayload: 16 * 1024 });
attachGameConnections(wss, { enqueue, dequeue, ready, verifyToken, unavailableBots });

//etat des agents avant d'accepter des connexions
await checkAllAgents();

server.listen(3000, () => console.log('serveur sur :3000'));

//prechargement du modele local : lent, on ne bloque pas le demarrage
warmupOllama().catch((err) => console.error('[ollama] prechargement echoue :', err.message));

//Filet apres le boot : le check initial peut echouer parce que le reseau de
//l'hote n'etait pas encore pret (machine tout juste demarree), et le recheck
//de queue.js ne s'active que si des joueurs attendent en file. Sans ce filet,
//un demarrage rate laisse les bots morts jusqu'au prochain restart du
//conteneur. On ne re-teste que les agents des bots indisponibles, on s'arrete
//des que tout est revenu ou apres BOOT_RECHECK_ATTEMPTS : la sonde Mistral
//coute ~17 tokens, la serie complete reste negligeable.
const BOOT_RECHECK_DELAY_S = 30;
//30 essais x 30 s = 15 min de filet. Les 10 premiers essais (5 min) ont ete
//epuises deux fois en un jour par un reseau hote qui met plus de 5 min a
//revenir apres un boot ou un make : la fenetre doit couvrir ce cas.
const BOOT_RECHECK_ATTEMPTS = 30;

function recheckDownAgentsAfterBoot()
{
	let attempts = 0;
	const timer = setInterval(() =>
	{
		attempts++;
		recheckDownAgents().finally(() =>
		{
			const down = unavailableBots();
			if (!down.length)
				clearInterval(timer);
			else if (attempts >= BOOT_RECHECK_ATTEMPTS)
			{
				clearInterval(timer);
				console.error(`[agents] re-check apres boot epuise (${attempts} essais) : toujours KO — ${down.map((b) => b.agent).join(', ')}`);
			}
		});
	}, BOOT_RECHECK_DELAY_S * 1000);
	timer.unref();
}

if (unavailableBots().length)
	recheckDownAgentsAfterBoot();
