import { PulseTraceSDK, PulseTraceConfig } from './client.js';

export function createPulseTraceFastifyPlugin(config: PulseTraceConfig) {
  const sdk = new PulseTraceSDK(config);

  return function (fastify: any, _opts: any, done: (err?: Error) => void) {
    fastify.addHook('onRequest', (request: any, _reply: any, hookDone: () => void) => {
      request.pulseTraceStart = process.hrtime();
      request.pulseTraceTraceId = (request.headers['x-trace-id'] as string) || crypto.randomUUID();
      request.pulseTraceSpanId = crypto.randomUUID();
      hookDone();
    });

    fastify.addHook('onResponse', (request: any, reply: any, hookDone: () => void) => {
      if (request.pulseTraceStart) {
        const diff = process.hrtime(request.pulseTraceStart);
        const durationMs = Number((diff[0] * 1000 + diff[1] / 1e6).toFixed(2));
        const rawPath = request.url || '/';
        const route = request.routeOptions?.url || rawPath;

        sdk.track({
          traceId: request.pulseTraceTraceId,
          spanId: request.pulseTraceSpanId,
          request: {
            method: request.method,
            path: rawPath,
            route,
            headers: request.headers as Record<string, string>,
            queryParams: request.query as Record<string, string>,
            bodySize: Number(request.headers['content-length'] || 0),
            clientIp: request.ip,
            timestamp: new Date().toISOString(),
          },
          response: {
            statusCode: reply.statusCode,
            headers: reply.getHeaders() as Record<string, string>,
            bodySize: Number(reply.getHeader('content-length') || 0),
            durationMs,
            timestamp: new Date().toISOString(),
          },
          error: {
            isError: reply.statusCode >= 400,
          },
        });
      }
      hookDone();
    });

    done();
  };
}
