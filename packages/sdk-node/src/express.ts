import { PulseTraceSDK, PulseTraceConfig } from './client.js';

export function createPulseTraceExpressMiddleware(config: PulseTraceConfig) {
  const sdk = new PulseTraceSDK(config);

  return function (req: any, res: any, next: () => void) {
    const start = process.hrtime();
    const traceId = (req.headers['x-trace-id'] as string) || crypto.randomUUID();
    const spanId = crypto.randomUUID();

    res.on('finish', () => {
      const diff = process.hrtime(start);
      const durationMs = Number((diff[0] * 1000 + diff[1] / 1e6).toFixed(2));
      const rawPath = req.originalUrl || req.url || '/';
      const route = req.route ? req.route.path : rawPath;

      sdk.track({
        traceId,
        spanId,
        request: {
          method: req.method,
          path: rawPath,
          route,
          headers: req.headers as Record<string, string>,
          queryParams: req.query as Record<string, string>,
          bodySize: Number(req.headers['content-length'] || 0),
          clientIp: req.ip,
          timestamp: new Date().toISOString(),
        },
        response: {
          statusCode: res.statusCode,
          headers: res.getHeaders ? (res.getHeaders() as Record<string, string>) : {},
          bodySize: Number(res.getHeader ? res.getHeader('content-length') || 0 : 0),
          durationMs,
          timestamp: new Date().toISOString(),
        },
        error: {
          isError: res.statusCode >= 400,
        },
      });
    });

    next();
  };
}
