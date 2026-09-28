import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import Redis from 'ioredis';

export default fp(async (fastify: FastifyInstance) => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const redis = new Redis(redisUrl);

  fastify.decorate('redis', redis);

  fastify.addHook('onClose', async () => {
    await redis.quit();
  });
});

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis;
  }
}
