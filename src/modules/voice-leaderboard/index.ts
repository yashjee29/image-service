import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { templateRegistry } from '../../core/templates/template-registry.js';
import { voiceLeaderboardModule } from './module.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TEMPLATE_PATH = resolve(__dirname, 'templates/leaderboard.svg');

// Register template on startup
templateRegistry.register(voiceLeaderboardModule.id, TEMPLATE_PATH);

export { voiceLeaderboardModule };
export * from './schema.js';
export * from './config.js';
