import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters'),
  description: z.string().optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
});

export const createApiKeySchema = z.object({
  name: z.string().min(2, 'Key name must be at least 2 characters'),
  environment: z.string().default('production'),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
