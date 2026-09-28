import Redis from 'ioredis';
import { prisma } from '@pulsetrace/database';
import { TelemetryPayload } from '@pulsetrace/types';
import { calculatePercentiles } from '@pulsetrace/metrics';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(redisUrl);
const STREAM_KEY = 'pulsetrace:telemetry:stream';
const CONSUMER_GROUP = 'pulsetrace-worker-group';
const CONSUMER_NAME = `worker-${process.pid}`;

async function setupConsumerGroup() {
  try {
    await redis.xgroup('CREATE', STREAM_KEY, CONSUMER_GROUP, '0', 'MKSTREAM');
    console.log(`[Worker] Created Redis Stream Consumer Group: ${CONSUMER_GROUP}`);
  } catch (err: any) {
    if (err.message && err.message.includes('BUSYGROUP')) {
      // Group already exists
    } else {
      console.error('[Worker] Error setting up consumer group:', err);
    }
  }
}

async function processStreamBatch() {
  try {
    const results = (await redis.xreadgroup(
      'GROUP',
      CONSUMER_GROUP,
      CONSUMER_NAME,
      'COUNT',
      100,
      'BLOCK',
      2000,
      'STREAMS',
      STREAM_KEY,
      '>'
    )) as any;

    if (!results || !Array.isArray(results) || results.length === 0) return;

    const streamData = results[0][1];
    if (!streamData || streamData.length === 0) return;

    const messageIds: string[] = [];
    const groupedEvents: Map<string, { projectId: string; serviceName: string; environment: string; events: TelemetryPayload[] }> = new Map();

    for (const [msgId, fields] of streamData) {
      messageIds.push(msgId);
      const fieldObj: Record<string, string> = {};
      for (let i = 0; i < fields.length; i += 2) {
        fieldObj[fields[i]] = fields[i + 1];
      }

      if (!fieldObj.payload) continue;
      const payload: TelemetryPayload = JSON.parse(fieldObj.payload);
      const projectId = fieldObj.projectId;
      const environment = payload.environment || 'production';

      const key = `${projectId}:${payload.serviceName}:${environment}`;
      if (!groupedEvents.has(key)) {
        groupedEvents.set(key, {
          projectId,
          serviceName: payload.serviceName,
          environment,
          events: [],
        });
      }
      groupedEvents.get(key)!.events.push(payload);
    }

    // Process each aggregated group
    for (const [, group] of groupedEvents) {
      await processGroup(group.projectId, group.serviceName, group.environment, group.events);
    }

    // Acknowledge stream items
    if (messageIds.length > 0) {
      await redis.xack(STREAM_KEY, CONSUMER_GROUP, ...messageIds);
    }
  } catch (err) {
    console.error('[Worker] Error processing stream batch:', err);
  }
}

async function processGroup(
  projectId: string,
  serviceName: string,
  environmentName: string,
  events: TelemetryPayload[]
) {
  // 1. Ensure Service exists
  const service = await prisma.service.upsert({
    where: {
      projectId_name: {
        projectId,
        name: serviceName,
      },
    },
    update: {},
    create: {
      projectId,
      name: serviceName,
      description: `Auto-registered service (${serviceName})`,
    },
  });

  // Group events by route for endpoint-level metrics
  const endpointGroup: Map<string, TelemetryPayload[]> = new Map();

  for (const ev of events) {
    const route = ev.request.route || ev.request.path || '/';
    const method = ev.request.method.toUpperCase();
    const epKey = `${method}:${route}`;

    if (!endpointGroup.has(epKey)) {
      endpointGroup.set(epKey, []);
    }
    endpointGroup.get(epKey)!.push(ev);
  }

  const now = new Date();
  // Round to nearest 1-minute bucket start
  const bucketStart = new Date(Math.floor(now.getTime() / 60000) * 60000);

  for (const [epKey, epEvents] of endpointGroup) {
    const [method, route] = epKey.split(':');
    const firstPath = epEvents[0].request.path;

    // Ensure Endpoint exists
    const endpoint = await prisma.endpoint.upsert({
      where: {
        serviceId_method_route: {
          serviceId: service.id,
          method,
          route,
        },
      },
      update: {},
      create: {
        serviceId: service.id,
        method,
        path: firstPath,
        route,
      },
    });

    const requestCount = epEvents.length;
    let errorCount = 0;
    const latencies: number[] = [];
    let totalLatency = 0;
    let latestCpu: number | undefined;
    let latestMemory: number | undefined;

    for (const ev of epEvents) {
      const isErr = ev.error?.isError || (ev.response && ev.response.statusCode >= 400);
      if (isErr) errorCount++;

      const dur = ev.response?.durationMs ?? 0;
      latencies.push(dur);
      totalLatency += dur;

      if (ev.resources?.cpuUsagePercent !== undefined) latestCpu = ev.resources.cpuUsagePercent;
      if (ev.resources?.memoryUsageBytes !== undefined) latestMemory = ev.resources.memoryUsageBytes;
    }

    const errorRate = Number(((errorCount / requestCount) * 100).toFixed(2));
    const avgLatencyMs = Number((totalLatency / requestCount).toFixed(2));
    const minLatencyMs = Math.min(...latencies);
    const maxLatencyMs = Math.max(...latencies);
    const percentiles = calculatePercentiles(latencies);

    // Upsert Metric Bucket for 1m window
    await prisma.metricBucket.upsert({
      where: {
        projectId_serviceId_endpointId_window_bucketStart: {
          projectId,
          serviceId: service.id,
          endpointId: endpoint.id,
          window: '1m',
          bucketStart,
        },
      },
      update: {
        requestCount: { increment: requestCount },
        errorCount: { increment: errorCount },
        errorRate,
        p50: percentiles.p50,
        p75: percentiles.p75,
        p90: percentiles.p90,
        p95: percentiles.p95,
        p99: percentiles.p99,
        avgLatencyMs,
        minLatencyMs,
        maxLatencyMs,
        cpuUsagePercent: latestCpu,
        memoryUsageBytes: latestMemory ? BigInt(latestMemory) : undefined,
      },
      create: {
        projectId,
        serviceId: service.id,
        endpointId: endpoint.id,
        environment: environmentName,
        window: '1m',
        bucketStart,
        requestCount,
        errorCount,
        errorRate,
        p50: percentiles.p50,
        p75: percentiles.p75,
        p90: percentiles.p90,
        p95: percentiles.p95,
        p99: percentiles.p99,
        avgLatencyMs,
        minLatencyMs,
        maxLatencyMs,
        cpuUsagePercent: latestCpu,
        memoryUsageBytes: latestMemory ? BigInt(latestMemory) : undefined,
      },
    });

    // 5. Publish live update to Redis Pub/Sub for WebSockets
    const liveMetric = {
      type: 'METRIC_UPDATE',
      projectId,
      serviceId: service.id,
      serviceName,
      endpointId: endpoint.id,
      route,
      requestCount,
      errorCount,
      errorRate,
      p95: percentiles.p95,
      p99: percentiles.p99,
      avgLatencyMs,
      timestamp: bucketStart.toISOString(),
    };

    await redis.publish('pulsetrace:metrics:live', JSON.stringify(liveMetric));

    // 6. Evaluate Alert Rules for this project/service
    await evaluateAlertRules(projectId, service.id, errorRate, percentiles.p95, percentiles.p99);
  }
}

async function evaluateAlertRules(
  projectId: string,
  serviceId: string,
  errorRate: number,
  p95: number,
  p99: number
) {
  const rules = await prisma.alertRule.findMany({
    where: {
      projectId,
      enabled: true,
      OR: [{ serviceId }, { serviceId: null }],
    },
  });

  for (const rule of rules) {
    let currentVal = 0;
    if (rule.metricType === 'error_rate') currentVal = errorRate;
    else if (rule.metricType === 'latency_p95') currentVal = p95;
    else if (rule.metricType === 'latency_p99') currentVal = p99;
    else continue;

    let isBreached = false;
    if (rule.operator === 'gt' && currentVal > rule.threshold) isBreached = true;
    else if (rule.operator === 'gte' && currentVal >= rule.threshold) isBreached = true;

    // Check open incident
    const openIncident = await prisma.incident.findFirst({
      where: {
        ruleId: rule.id,
        status: { in: ['OPEN', 'ACKNOWLEDGED'] },
      },
    });

    if (isBreached && !openIncident) {
      // Create new incident
      await prisma.incident.create({
        data: {
          ruleId: rule.id,
          projectId,
          serviceId,
          metricType: rule.metricType,
          threshold: rule.threshold,
          triggerValue: currentVal,
          status: 'OPEN',
        },
      });
      console.log(`🚨 Created Incident for rule: ${rule.name} (Value: ${currentVal})`);
    } else if (!isBreached && openIncident) {
      // Auto-resolve incident when metric recovers
      await prisma.incident.update({
        where: { id: openIncident.id },
        data: {
          status: 'RESOLVED',
          resolvedAt: new Date(),
        },
      });
      console.log(`✅ Auto-resolved Incident for rule: ${rule.name}`);
    }
  }
}

async function startWorker() {
  console.log('⚡ PulseTrace Telemetry Processing Worker Started');
  await setupConsumerGroup();

  // Processing loop
  while (true) {
    await processStreamBatch();
  }
}

startWorker().catch((err) => {
  console.error('[Worker] Fatal error:', err);
  process.exit(1);
});
