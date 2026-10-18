import { resolve } from 'node:path';
import { templateRegistry } from '../../core/templates/template-registry.js';
import { voiceLeaderboardModule } from './module.js';

const TEMPLATE_PATH = resolve(process.cwd(), 'templates', voiceLeaderboardModule.id, 'leaderboard.svg');
const STUDY_EXTENDED_PATH = resolve(process.cwd(), 'templates', voiceLeaderboardModule.id, 'study-leaderboard.svg');
const STUDY_PODIUM_PATH = resolve(process.cwd(), 'templates', voiceLeaderboardModule.id, 'study-leaderboard-2.svg');

// Register template on startup
templateRegistry.register(voiceLeaderboardModule.id, TEMPLATE_PATH);
templateRegistry.register('study-leaderboard', STUDY_EXTENDED_PATH);
templateRegistry.register('study-leaderboard-extended', STUDY_EXTENDED_PATH);
templateRegistry.register('study-leaderboard-2', STUDY_PODIUM_PATH);
templateRegistry.register('study-leaderboard-v1', STUDY_PODIUM_PATH);

export { voiceLeaderboardModule };
export * from './schema.js';
export * from './config.js';
