import { z } from 'zod';

export const createHealthCheckSchema = z.object({
  projectId: z.string().uuid(),
  serviceId: z.string().optional(),
  name: z.string().min(2),
  url: z.string().url(),
  method: z.enum(['GET', 'POST', 'HEAD']).default('GET'),
  intervalSeconds: z.number().int().min(10).max(3600).default(60),
  timeoutMs: z.number().int().min(500).max(30000).default(5000),
  expectedStatus: z.number().int().default(200),
  enabled: z.boolean().default(true),
});

export const updateHealthCheckSchema = createHealthCheckSchema.partial().omit({ projectId: true });

export type CreateHealthCheckInput = z.infer<typeof createHealthCheckSchema>;
export type UpdateHealthCheckInput = z.infer<typeof updateHealthCheckSchema>;
