import { FastifyInstance } from 'fastify';

export default async function systemRoutes(fastify: FastifyInstance) {
  // Liveness check
  fastify.get('/health', async (_request, reply) => {
    return reply.send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Readiness check (DB & Redis ping)
  fastify.get('/ready', async (_request, reply) => {
    try {
      await fastify.prisma.$queryRaw`SELECT 1`;
      await fastify.redis.ping();

      return reply.send({
        status: 'ready',
        database: 'connected',
        redis: 'connected',
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      return reply.status(503).send({
        status: 'not_ready',
        error: err.message,
        timestamp: new Date().toISOString(),
      });
    }
  });
}
