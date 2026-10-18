import { resolve } from 'node:path';
import { templateRegistry } from '../../core/templates/template-registry.js';
import { voiceLeaderboardModule } from './module.js';

const TEMPLATE_PATH = resolve(process.cwd(), 'templates', voiceLeaderboardModule.id, 'leaderboard.svg');

// Register template on startup
templateRegistry.register(voiceLeaderboardModule.id, TEMPLATE_PATH);

export { voiceLeaderboardModule };
export * from './schema.js';
export * from './config.js';
