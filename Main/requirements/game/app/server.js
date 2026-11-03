
import express from 'express';
import http from 'node:http';
import { WebSocketServer } from 'ws';
import { enqueue, dequeue, ready } from './game/queue.js';
import { checkAllAgents, recheckDownAgents, unavailableBots } from './agents/index_agent.js';
import { warmupOllama } from './agents/ollama_local.js';
import { verifyToken } from './auth.js';
import { attachGameConnections } from './gameConnections.js';
import { createTelemetry } from './telemetry.js';
import { botEntries } from './game/config.js';

const app = express();
const telemetry = createTelemetry();
app.use(telemetry.http);
app.get('/metrics', telemetry.metrics);

// Health check du frontend (gameSocket.ts : waitForGameServer) : repondre
// 204 en HTTP simple evite « Failed to load resource: 404 » dans la console
// du navigateur. Les upgrades WebSocket passent par ws, pas par Express.
app.get('/ws/game', (req, res) => res.status(204).end());
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/game', maxPayload: 16 * 1024 });
telemetry.websocket(wss);
attachGameConnections(wss, { enqueue, dequeue, ready, verifyToken, unavailableBots });

//etat des agents avant d'accepter des connexions
await checkAllAgents();

server.listen(3000, () => console.log('serveur sur :3000'));

//prechargement du modele local : lent, on ne bloque pas le demarrage
if (botEntries().flat().some((entry) => entry.agent === 'local_agent'))
  warmupOllama().catch((err) => console.error('[ollama] prechargement echoue :', err.message));

//Filet apres le boot : le check initial peut echouer parce que le reseau de
//l'hote n'etait pas encore pret (machine tout juste demarree), et le recheck
//de queue.js ne s'active que si des joueurs attendent en file. Sans ce filet,
//un demarrage rate laisse les bots morts jusqu'au prochain restart du
//conteneur. On ne re-teste que les agents des bots indisponibles, on s'arrete
//des que tout est revenu : la sonde Mistral coute ~17 tokens, la serie
//complete reste negligeable.
const BOOT_RECHECK_DELAY_S = 30;
//Le filet n'a pas de fin : un nombre d'essais fixe a ete epuise par un reseau
//hote qui ne revient qu'apres le VPN de session (constate : 30 essais x 30 s
//epuises au boot, reseau operationnel ~20 min apres). Plutot que de relancer
//le conteneur a la main, le filet ralentit : toutes les 30 s pendant 15 min,
//puis toutes les 5 min jusqu'a la fin du processus.
const BOOT_RECHECK_FAST_ATTEMPTS = 30;	//30 x 30 s = 15 min au rythme rapide
const BOOT_RECHECK_SLOW_DELAY_S = 300;	//ensuite, une sonde toutes les 5 min

let bootRecheckAttempts = 0;

function recheckDownAgentsAfterBoot()
{
	const fast = bootRecheckAttempts < BOOT_RECHECK_FAST_ATTEMPTS;
	const timer = setTimeout(async () =>
	{
		bootRecheckAttempts++;
		await recheckDownAgents();

		const down = unavailableBots();
		if (down.length)
		{
			//Au rythme lent, une ligne par heure suffit a dire que le filet
			//veille toujours.
			if (fast || bootRecheckAttempts % 12 === 0)
				console.error(`[agents] re-check apres boot (${bootRecheckAttempts} essais) : toujours KO — ${down.map((b) => b.agent).join(', ')}`);
			recheckDownAgentsAfterBoot();
		}
	}, (fast ? BOOT_RECHECK_DELAY_S : BOOT_RECHECK_SLOW_DELAY_S) * 1000);
	timer.unref();
}

if (unavailableBots().length)
	recheckDownAgentsAfterBoot();
