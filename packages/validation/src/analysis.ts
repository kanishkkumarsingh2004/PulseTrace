import { z } from "zod";

export const analyzeRequestSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, "url is required")
    .max(2048, "url must be at most 2048 characters")
    .url("url must be a valid URL")
    .refine((value) => !/\s/.test(value), "url must not contain whitespace"),
  durationSeconds: z.coerce
    .number()
    .int("durationSeconds must be an integer")
    .min(1, "durationSeconds must be at least 1")
    .max(300, "durationSeconds must be at most 300")
    .default(10),
  virtualUsers: z.coerce
    .number()
    .int("virtualUsers must be an integer")
    .min(1, "virtualUsers must be at least 1")
    .max(50000000, "virtualUsers must be at most 50000000")
    .default(1000),
  concurrencyPerUser: z.coerce
    .number()
    .int("concurrencyPerUser must be an integer")
    .min(1, "concurrencyPerUser must be at least 1")
    .max(10, "concurrencyPerUser must be at most 10")
    .default(1),
});

export type AnalyzeRequestInput = z.infer<typeof analyzeRequestSchema>;
