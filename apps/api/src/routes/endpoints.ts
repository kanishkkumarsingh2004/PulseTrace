import { FastifyInstance } from 'fastify';

export default async function endpointRoutes(fastify: FastifyInstance) {
  // List endpoints for a service
  fastify.get('/services/:serviceId/endpoints', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { serviceId } = request.params as { serviceId: string };

    const endpoints = await fastify.prisma.endpoint.findMany({
      where: { serviceId },
      orderBy: { route: 'asc' },
    });

    return reply.send({ data: endpoints });
  });

  // Get endpoint detail by ID
  fastify.get('/endpoints/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const endpoint = await fastify.prisma.endpoint.findUnique({
      where: { id },
      include: {
        service: {
          include: {
            project: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!endpoint) {
      return reply.status(404).send({
        error: {
          code: 'ENDPOINT_NOT_FOUND',
          message: 'Endpoint not found',
          requestId: (request as any).requestId,
        },
      });
    }

    return reply.send({ data: endpoint });
  });
}
