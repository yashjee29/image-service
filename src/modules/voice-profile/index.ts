import { resolve } from 'node:path';
import { templateRegistry } from '../../core/templates/template-registry.js';
import { voiceProfileModule } from './module.js';

const TEMPLATE_PATH = resolve(process.cwd(), 'templates', voiceProfileModule.id, 'profile.svg');

// Register template on startup
templateRegistry.register(voiceProfileModule.id, TEMPLATE_PATH);

export { voiceProfileModule };
export * from './schema.js';
export * from './config.js';
