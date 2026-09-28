import { FastifyInstance } from 'fastify';

export default async function websocketRoutes(fastify: FastifyInstance) {
  fastify.get('/ws/metrics', { websocket: true }, (connection, req) => {
    fastify.log.info('Client connected to real-time metrics WebSocket stream');

    // Subscribe to Redis pub/sub channel for metric updates
    const subRedis = fastify.redis.duplicate();
    subRedis.subscribe('pulsetrace:metrics:live');

    subRedis.on('message', (channel, message) => {
      if (channel === 'pulsetrace:metrics:live') {
        connection.socket.send(message);
      }
    });

    // Send initial ping to keep connection alive
    const interval = setInterval(() => {
      if (connection.socket.readyState === 1) {
        connection.socket.send(JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() }));
      }
    }, 15000);

    connection.socket.on('close', () => {
      clearInterval(interval);
      subRedis.quit();
      fastify.log.info('Client disconnected from real-time WebSocket stream');
    });
  });
}
