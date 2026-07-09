/*import { Router } from 'express';
import { generateReply } from './agents/index.js';

const router = Router();

router.get('/', (req, res) =>
{
	res.status(200).send('Bienvenue sur Aimpostor');
});

router.post('/respond', async (req, res) =>
{
	const agentName = req.headers['agent'];

	try
	{
		const history = req.body.history;
		const reply = await generateReply(history, agentName)
		res.json({ reply });
	}
	catch (err)
	{
		console.error(err);
		res.status(500).json({ error: 'llm_failed' });
	}
});

export default router;*/
