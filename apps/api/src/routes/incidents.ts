import { FastifyInstance } from 'fastify';

export default async function incidentRoutes(fastify: FastifyInstance) {
  // List incidents for project
  fastify.get('/projects/:projectId/incidents', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const { status } = request.query as { status?: string };

    const where: any = { projectId };
    if (status) {
      where.status = status.toUpperCase();
    }

    const incidents = await fastify.prisma.incident.findMany({
      where,
      include: {
        rule: { select: { id: true, name: true, severity: true } },
        service: { select: { id: true, name: true } },
      },
      orderBy: { triggeredAt: 'desc' },
    });

    return reply.send({ data: incidents });
  });

  // Acknowledge incident
  fastify.post('/incidents/:id/acknowledge', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const incident = await fastify.prisma.incident.update({
      where: { id },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date(),
      },
    });

    return reply.send({ data: incident });
  });

  // Resolve incident
  fastify.post('/incidents/:id/resolve', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const incident = await fastify.prisma.incident.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
      },
    });

    return reply.send({ data: incident });
  });
}
