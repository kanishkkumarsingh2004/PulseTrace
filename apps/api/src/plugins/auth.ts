import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import { AuthUser } from '@pulsetrace/types';

export default fp(async (fastify: FastifyInstance) => {
  const secret = process.env.JWT_SECRET || 'super-secret-jwt-key-pulsetrace-2026';

  await fastify.register(fastifyJwt, {
    secret,
  });

  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or missing authentication token',
          requestId: (request as any).requestId || 'unknown',
        },
      });
    }
  });
});

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: AuthUser;
  }
}
