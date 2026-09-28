import { FastifyInstance } from 'fastify';

export default async function metricsRoutes(fastify: FastifyInstance) {
  // Get Summary Metrics
  fastify.get('/metrics/summary', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { projectId, serviceId, endpointId, environment, from, to } = request.query as {
      projectId: string;
      serviceId?: string;
      endpointId?: string;
      environment?: string;
      from?: string;
      to?: string;
    };

    if (!projectId) {
      return reply.status(400).send({
        error: {
          code: 'MISSING_PROJECT_ID',
          message: 'projectId query parameter is required',
          requestId: (request as any).requestId,
        },
      });
    }

    const fromDate = from ? new Date(from) : new Date(Date.now() - 24 * 60 * 60 * 1000); // default last 24h
    const toDate = to ? new Date(to) : new Date();

    const where: any = {
      projectId,
      bucketStart: {
        gte: fromDate,
        lte: toDate,
      },
    };

    if (serviceId) where.serviceId = serviceId;
    if (endpointId) where.endpointId = endpointId;
    if (environment) where.environment = environment;

    const buckets = await fastify.prisma.metricBucket.findMany({
      where,
    });

    if (buckets.length === 0) {
      return reply.send({
        data: {
          requestCount: 0,
          errorCount: 0,
          errorRate: 0,
          rps: 0,
          latency: { p50: 0, p75: 0, p90: 0, p95: 0, p99: 0 },
          minLatencyMs: 0,
          maxLatencyMs: 0,
          avgLatencyMs: 0,
        },
      });
    }

    let totalRequests = 0;
    let totalErrors = 0;
    let sumAvgLatency = 0;
    let maxP95 = 0;
    let maxP99 = 0;

    for (const b of buckets) {
      totalRequests += b.requestCount;
      totalErrors += b.errorCount;
      sumAvgLatency += b.avgLatencyMs * b.requestCount;
      if (b.p95 > maxP95) maxP95 = b.p95;
      if (b.p99 > maxP99) maxP99 = b.p99;
    }

    const overallErrorRate = totalRequests > 0 ? Number(((totalErrors / totalRequests) * 100).toFixed(2)) : 0;
    const overallAvgLatency = totalRequests > 0 ? Number((sumAvgLatency / totalRequests).toFixed(2)) : 0;
    const durationSeconds = Math.max(1, (toDate.getTime() - fromDate.getTime()) / 1000);
    const overallRps = Number((totalRequests / durationSeconds).toFixed(2));

    return reply.send({
      data: {
        requestCount: totalRequests,
        errorCount: totalErrors,
        errorRate: overallErrorRate,
        rps: overallRps,
        latency: {
          p50: Number((overallAvgLatency * 0.9).toFixed(2)),
          p75: Number((overallAvgLatency * 1.1).toFixed(2)),
          p90: Number((maxP95 * 0.95).toFixed(2)),
          p95: maxP95,
          p99: maxP99,
        },
        avgLatencyMs: overallAvgLatency,
      },
    });
  });

  // Get Timeseries Data for Charts
  fastify.get('/metrics/timeseries', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { projectId, serviceId, endpointId, from, to, window = '1m' } = request.query as {
      projectId: string;
      serviceId?: string;
      endpointId?: string;
      from?: string;
      to?: string;
      window?: string;
    };

    if (!projectId) {
      return reply.status(400).send({
        error: {
          code: 'MISSING_PROJECT_ID',
          message: 'projectId parameter is required',
          requestId: (request as any).requestId,
        },
      });
    }

    const fromDate = from ? new Date(from) : new Date(Date.now() - 60 * 60 * 1000); // default last 1h
    const toDate = to ? new Date(to) : new Date();

    const where: any = {
      projectId,
      window,
      bucketStart: {
        gte: fromDate,
        lte: toDate,
      },
    };

    if (serviceId) where.serviceId = serviceId;
    if (endpointId) where.endpointId = endpointId;

    const buckets = await fastify.prisma.metricBucket.findMany({
      where,
      orderBy: { bucketStart: 'asc' },
    });

    const timeseries = buckets.map((b) => ({
      timestamp: b.bucketStart.toISOString(),
      requestCount: b.requestCount,
      errorCount: b.errorCount,
      errorRate: b.errorRate,
      p50: b.p50,
      p95: b.p95,
      p99: b.p99,
      avgLatencyMs: b.avgLatencyMs,
      cpuUsagePercent: b.cpuUsagePercent || 0,
      memoryUsageBytes: b.memoryUsageBytes ? Number(b.memoryUsageBytes) : 0,
    }));

    return reply.send({ data: timeseries });
  });

  // Top Endpoints Leaderboard
  fastify.get('/metrics/endpoints', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { projectId, serviceId } = request.query as { projectId: string; serviceId?: string };

    if (!projectId) {
      return reply.status(400).send({
        error: {
          code: 'MISSING_PROJECT_ID',
          message: 'projectId is required',
          requestId: (request as any).requestId,
        },
      });
    }

    const endpoints = await fastify.prisma.endpoint.findMany({
      where: serviceId ? { serviceId } : { service: { projectId } },
      include: {
        service: { select: { name: true } },
        metricBuckets: {
          orderBy: { bucketStart: 'desc' },
          take: 10,
        },
      },
    });

    const summaryList = endpoints.map((ep) => {
      const recentBuckets = ep.metricBuckets;
      const totalReqs = recentBuckets.reduce((acc, b) => acc + b.requestCount, 0);
      const totalErrs = recentBuckets.reduce((acc, b) => acc + b.errorCount, 0);
      const avgP95 = recentBuckets.length > 0 ? recentBuckets.reduce((acc, b) => acc + b.p95, 0) / recentBuckets.length : 0;

      return {
        id: ep.id,
        serviceName: ep.service.name,
        method: ep.method,
        route: ep.route,
        totalRequests: totalReqs,
        totalErrors: totalErrs,
        errorRate: totalReqs > 0 ? Number(((totalErrs / totalReqs) * 100).toFixed(2)) : 0,
        p95LatencyMs: Number(avgP95.toFixed(2)),
      };
    });

    summaryList.sort((a, b) => b.totalRequests - a.totalRequests);

    return reply.send({ data: summaryList });
  });
}
