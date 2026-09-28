import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { telemetryBatchSchema } from '@pulsetrace/validation';
import { sanitizeTelemetryPayload } from '@pulsetrace/telemetry';

export default async function telemetryRoutes(fastify: FastifyInstance) {
  fastify.post('/telemetry', async (request, reply) => {
    const parseResult = telemetryBatchSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: 'INVALID_TELEMETRY_PAYLOAD',
          message: 'Telemetry payload structure failed validation',
          details: parseResult.error.flatten(),
          requestId: (request as any).requestId,
        },
      });
    }

    const { apiKey: rawApiKey, events } = parseResult.data;

    // Extract prefix
    const keyPrefix = rawApiKey.slice(0, 8);
    const candidateKeys = await fastify.prisma.apiKey.findMany({
      where: {
        keyPrefix,
        isRevoked: false,
      },
      include: {
        project: true,
      },
    });

    let matchedKeyRecord = null;
    for (const keyCandidate of candidateKeys) {
      const isMatch = await bcrypt.compare(rawApiKey, keyCandidate.keyHash);
      if (isMatch) {
        matchedKeyRecord = keyCandidate;
        break;
      }
    }

    if (!matchedKeyRecord) {
      return reply.status(401).send({
        error: {
          code: 'UNAUTHORIZED_API_KEY',
          message: 'Invalid or revoked ingestion API key',
          requestId: (request as any).requestId,
        },
      });
    }

    // Update lastUsedAt asynchronously (fire and forget)
    fastify.prisma.apiKey
      .update({
        where: { id: matchedKeyRecord.id },
        data: { lastUsedAt: new Date() },
      })
      .catch(() => {});

    // Push each event to Redis Stream in batch pipeline
    const pipeline = fastify.redis.pipeline();

    for (const rawEvent of events) {
      const sanitizedEvent = sanitizeTelemetryPayload(rawEvent as any);
      const streamMessage = {
        projectId: matchedKeyRecord.projectId,
        environmentId: matchedKeyRecord.environmentId || '',
        apiKeyId: matchedKeyRecord.id,
        payload: JSON.stringify(sanitizedEvent),
        ingestedAt: new Date().toISOString(),
      };

      pipeline.xadd(
        'pulsetrace:telemetry:stream',
        '*',
        'projectId',
        streamMessage.projectId,
        'environmentId',
        streamMessage.environmentId,
        'apiKeyId',
        streamMessage.apiKeyId,
        'payload',
        streamMessage.payload,
        'ingestedAt',
        streamMessage.ingestedAt
      );
    }

    await pipeline.exec();

    // Return 202 Accepted immediately per spec
    return reply.status(202).send({
      data: {
        accepted: true,
        count: events.length,
        receivedAt: new Date().toISOString(),
      },
    });
  });
}
