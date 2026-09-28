import { z } from 'zod';

export const createAlertRuleSchema = z.object({
  projectId: z.string().uuid(),
  serviceId: z.string().optional(),
  name: z.string().min(2),
  metricType: z.enum(['latency_p95', 'latency_p99', 'error_rate', 'throughput_rps', 'cpu_usage', 'memory_usage']),
  operator: z.enum(['gt', 'gte', 'lt', 'lte', 'eq']),
  threshold: z.number(),
  evaluationWindowMinutes: z.number().int().positive().default(5),
  severity: z.enum(['critical', 'warning', 'info']).default('critical'),
  enabled: z.boolean().default(true),
});

export const updateAlertRuleSchema = createAlertRuleSchema.partial().omit({ projectId: true });

export type CreateAlertRuleInput = z.infer<typeof createAlertRuleSchema>;
export type UpdateAlertRuleInput = z.infer<typeof updateAlertRuleSchema>;
