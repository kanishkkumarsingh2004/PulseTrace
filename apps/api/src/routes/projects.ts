import { FastifyInstance } from 'fastify';
import { createProjectSchema, updateProjectSchema } from '@pulsetrace/validation';

export default async function projectRoutes(fastify: FastifyInstance) {
  // List user projects
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const userId = request.user.id;
    const projects = await fastify.prisma.project.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        services: { select: { id: true, name: true } },
        environments: { select: { id: true, name: true } },
        _count: { select: { services: true, apiKeys: true, alertRules: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send({ data: projects });
  });

  // Get project by ID
  fastify.get('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.id;

    const project = await fastify.prisma.project.findFirst({
      where: {
        id,
        members: {
          some: { userId },
        },
      },
      include: {
        environments: true,
        services: {
          include: {
            endpoints: true,
          },
        },
        apiKeys: {
          select: {
            id: true,
            name: true,
            keyPrefix: true,
            isRevoked: true,
            createdAt: true,
            lastUsedAt: true,
          },
        },
      },
    });

    if (!project) {
      return reply.status(404).send({
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: 'Project not found or access denied',
          requestId: (request as any).requestId,
        },
      });
    }

    return reply.send({ data: project });
  });

  // Create project
  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const parseResult = createProjectSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid project payload',
          details: parseResult.error.flatten(),
          requestId: (request as any).requestId,
        },
      });
    }

    const { name, description } = parseResult.data;
    const userId = request.user.id;

    const project = await fastify.prisma.project.create({
      data: {
        name,
        description,
        members: {
          create: {
            userId,
            role: 'ADMIN',
          },
        },
        environments: {
          createMany: {
            data: [{ name: 'production' }, { name: 'staging' }, { name: 'development' }],
          },
        },
      },
      include: {
        environments: true,
      },
    });

    return reply.status(201).send({ data: project });
  });

  // Update project
  fastify.put('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parseResult = updateProjectSchema.safeParse(request.body);
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

    const updated = await fastify.prisma.project.update({
      where: { id },
      data: parseResult.data,
    });

    return reply.send({ data: updated });
  });

  // Delete project
  fastify.delete('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await fastify.prisma.project.delete({
      where: { id },
    });

    return reply.send({ data: { message: 'Project deleted successfully' } });
  });
}
