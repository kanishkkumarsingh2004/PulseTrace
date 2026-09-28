import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { registerSchema, loginSchema } from '@pulsetrace/validation';

export default async function authRoutes(fastify: FastifyInstance) {
  // Register
  fastify.post('/register', async (request, reply) => {
    const parseResult = registerSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid registration input',
          details: parseResult.error.flatten(),
          requestId: (request as any).requestId,
        },
      });
    }

    const { email, password, name } = parseResult.data;

    const existingUser = await fastify.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return reply.status(409).send({
        error: {
          code: 'USER_EXISTS',
          message: 'A user with this email address already exists',
          requestId: (request as any).requestId,
        },
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await fastify.prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: 'MEMBER',
      },
    });

    const token = fastify.jwt.sign({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    return reply.status(201).send({
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
    });
  });

  // Login
  fastify.post('/login', async (request, reply) => {
    const parseResult = loginSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid login input',
          details: parseResult.error.flatten(),
          requestId: (request as any).requestId,
        },
      });
    }

    const { email, password } = parseResult.data;

    const user = await fastify.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return reply.status(401).send({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
          requestId: (request as any).requestId,
        },
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return reply.status(401).send({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
          requestId: (request as any).requestId,
        },
      });
    }

    const token = fastify.jwt.sign({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    return reply.send({
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
    });
  });

  // Current User
  fastify.get('/me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const userPayload = request.user;
    const user = await fastify.prisma.user.findUnique({
      where: { id: userPayload.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return reply.status(440).send({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User session no longer valid',
          requestId: (request as any).requestId,
        },
      });
    }

    return reply.send({ data: user });
  });

  // Logout
  fastify.post('/logout', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    return reply.send({ data: { message: 'Successfully logged out' } });
  });
}
