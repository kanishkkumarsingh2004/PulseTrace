import { z } from 'zod';

export const telemetryRequestSchema = z.object({
  method: z.string().toUpperCase(),
  path: z.string(),
  route: z.string(),
  headers: z.record(z.string()).optional(),
  queryParams: z.record(z.string()).optional(),
  bodySize: z.number().nonnegative(),
  clientIp: z.string().optional(),
  timestamp: z.string().datetime(),
});

export const telemetryResponseSchema = z.object({
  statusCode: z.number().int().min(100).max(599),
  headers: z.record(z.string()).optional(),
  bodySize: z.number().nonnegative(),
  durationMs: z.number().nonnegative(),
  timestamp: z.string().datetime(),
});

export const telemetryErrorSchema = z.object({
  isError: z.boolean(),
  errorType: z.string().optional(),
  errorMessage: z.string().optional(),
  stackTrace: z.string().optional(),
}).optional();

export const telemetryResourceSchema = z.object({
  cpuUsagePercent: z.number().optional(),
  memoryUsageBytes: z.number().optional(),
  heapUsedBytes: z.number().optional(),
  activeHandles: z.number().optional(),
}).optional();

export const telemetryPayloadSchema = z.object({
  traceId: z.string(),
  spanId: z.string(),
  parentSpanId: z.string().optional(),
  serviceName: z.string().min(1),
  environment: z.string().default('production'),
  sdkVersion: z.string(),
  request: telemetryRequestSchema,
  response: telemetryResponseSchema,
  error: telemetryErrorSchema,
  resources: telemetryResourceSchema,
  customMetadata: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
});

export const telemetryBatchSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  sentAt: z.string().datetime(),
  events: z.array(telemetryPayloadSchema).min(1, 'Events array cannot be empty'),
});

export type TelemetryBatchInput = z.infer<typeof telemetryBatchSchema>;
export type TelemetryPayloadInput = z.infer<typeof telemetryPayloadSchema>;
