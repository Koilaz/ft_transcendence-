import { gameConfig } from '../../../../requirements/game/app/game/config.js';
import { buildSystemPrompt } from './prompt.js';

const SYSTEM_PROMPT = buildSystemPrompt();

const TIMEOUT_MS = gameConfig.turnDuration * 1000;
 //#TODO
