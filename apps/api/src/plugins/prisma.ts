import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { prisma } from '@pulsetrace/database';

export default fp(async (fastify: FastifyInstance) => {
  fastify.decorate('prisma', prisma);
});

declare module 'fastify' {
  interface FastifyInstance {
    prisma: typeof prisma;
  }
}
