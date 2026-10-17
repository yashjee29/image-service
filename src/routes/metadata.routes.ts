import type { FastifyPluginAsync } from 'fastify';
import { moduleRegistry } from '../modules/registry.js';

export const metadataRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/v1/modules', async () => {
    return {
      success: true,
      modules: moduleRegistry.getMetadataList(),
    };
  });
};
