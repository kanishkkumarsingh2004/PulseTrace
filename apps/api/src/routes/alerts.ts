import { FastifyInstance } from 'fastify';
import { createAlertRuleSchema, updateAlertRuleSchema } from '@pulsetrace/validation';

export default async function alertRoutes(fastify: FastifyInstance) {
  // List alert rules for project
  fastify.get('/projects/:projectId/alerts', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { projectId } = request.params as { projectId: string };

    const rules = await fastify.prisma.alertRule.findMany({
      where: { projectId },
      include: {
        service: { select: { id: true, name: true } },
        _count: { select: { incidents: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send({ data: rules });
  });

  // Create alert rule
  fastify.post('/projects/:projectId/alerts', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const parseResult = createAlertRuleSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid alert rule payload',
          details: parseResult.error.flatten(),
          requestId: (request as any).requestId,
        },
      });
    }

    const rule = await fastify.prisma.alertRule.create({
      data: parseResult.data,
      include: {
        service: { select: { id: true, name: true } },
      },
    });

    return reply.status(201).send({ data: rule });
  });

  // Update alert rule
  fastify.put('/alerts/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parseResult = updateAlertRuleSchema.safeParse(request.body);
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

    const updated = await fastify.prisma.alertRule.update({
      where: { id },
      data: parseResult.data,
    });

    return reply.send({ data: updated });
  });

  // Delete alert rule
  fastify.delete('/alerts/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await fastify.prisma.alertRule.delete({
      where: { id },
    });

    return reply.send({ data: { message: 'Alert rule deleted successfully' } });
  });
}
