import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { createApiKeySchema } from '@pulsetrace/validation';

export default async function apiKeyRoutes(fastify: FastifyInstance) {
  // Create API Key
  fastify.post('/projects/:projectId/keys', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const parseResult = createApiKeySchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid API Key creation payload',
          details: parseResult.error.flatten(),
          requestId: (request as any).requestId,
        },
      });
    }

    const { name, environment } = parseResult.data;

    // Find environment ID
    const envRecord = await fastify.prisma.environment.findFirst({
      where: { projectId, name: environment },
    });

    const randomSecret = crypto.randomBytes(16).toString('hex');
    const keyPrefix = 'pt_live_';
    const rawApiKey = `${keyPrefix}${randomSecret}`;
    const keyHash = await bcrypt.hash(rawApiKey, 10);

    const apiKey = await fastify.prisma.apiKey.create({
      data: {
        projectId,
        environmentId: envRecord?.id,
        name,
        keyPrefix,
        keyHash,
      },
    });

    return reply.status(201).send({
      data: {
        id: apiKey.id,
        name: apiKey.name,
        keyPrefix: apiKey.keyPrefix,
        rawApiKey, // Warning: ONLY shown once to user
        createdAt: apiKey.createdAt,
      },
    });
  });

  // Revoke API Key
  fastify.delete('/keys/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    await fastify.prisma.apiKey.update({
      where: { id },
      data: { isRevoked: true },
    });

    return reply.send({ data: { message: 'API key revoked successfully' } });
  });
}
