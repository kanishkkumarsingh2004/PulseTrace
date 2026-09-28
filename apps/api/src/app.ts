import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyWebsocket from '@fastify/websocket';

import prismaPlugin from './plugins/prisma.js';
import redisPlugin from './plugins/redis.js';
import requestIdPlugin from './plugins/requestId.js';
import authPlugin from './plugins/auth.js';

import systemRoutes from './routes/system.js';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import apiKeyRoutes from './routes/apiKeys.js';
import serviceRoutes from './routes/services.js';
import endpointRoutes from './routes/endpoints.js';
import telemetryRoutes from './routes/telemetry.js';
import metricsRoutes from './routes/metrics.js';
import alertRoutes from './routes/alerts.js';
import incidentRoutes from './routes/incidents.js';
import healthRoutes from './routes/health.js';
import websocketRoutes from './routes/websocket.js';

export function buildApp() {
  const app = Fastify({
    logger: process.env.NODE_ENV === 'development' ? { transport: { target: 'pino-pretty' } } : true,
  });

  // Register Core Plugins
  app.register(fastifyCors, {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  app.register(fastifyWebsocket);
  app.register(requestIdPlugin);
  app.register(prismaPlugin);
  app.register(redisPlugin);
  app.register(authPlugin);

  // Register System Routes
  app.register(systemRoutes);

  // Register API V1 Routes
  app.register(authRoutes, { prefix: '/api/v1/auth' });
  app.register(projectRoutes, { prefix: '/api/v1/projects' });
  app.register(apiKeyRoutes, { prefix: '/api/v1' });
  app.register(serviceRoutes, { prefix: '/api/v1' });
  app.register(endpointRoutes, { prefix: '/api/v1' });
  app.register(telemetryRoutes, { prefix: '/api/v1' });
  app.register(metricsRoutes, { prefix: '/api/v1' });
  app.register(alertRoutes, { prefix: '/api/v1' });
  app.register(incidentRoutes, { prefix: '/api/v1' });
  app.register(healthRoutes, { prefix: '/api/v1' });
  app.register(websocketRoutes);

  return app;
}
