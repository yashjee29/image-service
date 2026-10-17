import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { randomUUID } from 'node:crypto';

declare module 'fastify' {
  interface FastifyRequest {
    requestId: string;
    startTime: number;
  }
}

const requestContextPluginCallback: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', async (request, reply) => {
    const existingId = request.headers['x-request-id'];
    const requestId = typeof existingId === 'string' && existingId.trim() ? existingId : randomUUID();

    request.requestId = requestId;
    request.startTime = performance.now();
    reply.header('x-request-id', requestId);
  });
};

export const requestContextPlugin = fp(requestContextPluginCallback, {
  name: 'request-context',
});
