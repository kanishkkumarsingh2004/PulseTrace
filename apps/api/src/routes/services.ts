import { FastifyInstance } from 'fastify';

export default async function serviceRoutes(fastify: FastifyInstance) {
  // List services for project
  fastify.get('/projects/:projectId/services', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { projectId } = request.params as { projectId: string };

    const services = await fastify.prisma.service.findMany({
      where: { projectId },
      include: {
        endpoints: true,
        environment: true,
        _count: { select: { endpoints: true } },
      },
      orderBy: { name: 'asc' },
    });

    return reply.send({ data: services });
  });

  // Get service detail by ID
  fastify.get('/services/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const service = await fastify.prisma.service.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true } },
        environment: true,
        endpoints: {
          orderBy: { route: 'asc' },
        },
        healthChecks: true,
        alertRules: true,
      },
    });

    if (!service) {
      return reply.status(404).send({
        error: {
          code: 'SERVICE_NOT_FOUND',
          message: 'Service not found',
          requestId: (request as any).requestId,
        },
      });
    }

    return reply.send({ data: service });
  });
}
