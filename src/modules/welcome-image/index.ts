import { resolve } from 'node:path';
import { templateRegistry } from '../../core/templates/template-registry.js';
import { welcomeImageModule } from './module.js';

const TEMPLATE_PATH = resolve(process.cwd(), 'templates', 'welcome-image', 'welcome-image.svg');

// Register template on startup
templateRegistry.register(welcomeImageModule.id, TEMPLATE_PATH);
templateRegistry.register('welcome', TEMPLATE_PATH);
templateRegistry.register('welcome-card', TEMPLATE_PATH);
templateRegistry.register('welcome-image-v1', TEMPLATE_PATH);

export { welcomeImageModule };
export * from './schema.js';
export * from './config.js';
export * from './data-mapper.js';
export * from './renderer.js';
