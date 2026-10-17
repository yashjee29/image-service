import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { templateRegistry } from '../../core/templates/template-registry.js';
import { voiceProfileModule } from './module.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TEMPLATE_PATH = resolve(__dirname, 'templates/profile.svg');

// Register template on startup
templateRegistry.register(voiceProfileModule.id, TEMPLATE_PATH);

export { voiceProfileModule };
export * from './schema.js';
export * from './config.js';
