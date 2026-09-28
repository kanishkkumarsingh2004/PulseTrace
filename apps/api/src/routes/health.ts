import { FastifyInstance } from 'fastify';
import { createHealthCheckSchema, updateHealthCheckSchema } from '@pulsetrace/validation';

export default async function healthRoutes(fastify: FastifyInstance) {
  // List synthetic health checks for project
  fastify.get('/projects/:projectId/health-checks', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { projectId } = request.params as { projectId: string };

    const checks = await fastify.prisma.healthCheck.findMany({
      where: { projectId },
      include: {
        service: { select: { id: true, name: true } },
        results: {
          orderBy: { checkedAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send({ data: checks });
  });

  // Create health check
  fastify.post('/projects/:projectId/health-checks', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const parseResult = createHealthCheckSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid health check payload',
          details: parseResult.error.flatten(),
          requestId: (request as any).requestId,
        },
      });
    }

    const check = await fastify.prisma.healthCheck.create({
      data: parseResult.data,
      include: {
        service: { select: { id: true, name: true } },
      },
    });

    return reply.status(201).send({ data: check });
  });

  // Update health check
  fastify.put('/health-checks/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parseResult = updateHealthCheckSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid update payload',
          details: parseResult.error.flatten(),
          requestId: (request as any).requestId,
        },
      });
    }

    const updated = await fastify.prisma.healthCheck.update({
      where: { id },
      data: parseResult.data,
    });

    return reply.send({ data: updated });
  });

  // Delete health check
  fastify.delete('/health-checks/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await fastify.prisma.healthCheck.delete({
      where: { id },
    });

    return reply.send({ data: { message: 'Health check deleted successfully' } });
  });
}
