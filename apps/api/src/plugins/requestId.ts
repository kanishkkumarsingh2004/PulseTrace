import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import crypto from 'crypto';

export default fp(async (fastify: FastifyInstance) => {
  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const requestId = (request.headers['x-request-id'] as string) || crypto.randomUUID();
    (request as any).requestId = requestId;
    reply.header('x-request-id', requestId);
  });
});
