import { z } from 'zod';

export const metricsQuerySchema = z.object({
  projectId: z.string().uuid(),
  serviceId: z.string().optional(),
  endpointId: z.string().optional(),
  environment: z.string().optional(),
  window: z.enum(['1m', '5m', '1h', '1d']).default('1m'),
  from: z.string().datetime(),
  to: z.string().datetime(),
});

export type MetricsQueryInput = z.infer<typeof metricsQuerySchema>;
