import { z } from "zod";

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  MONGODB_URI: z.string().min(1).default("mongodb://localhost:27017/restaurant"),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(env: Record<string, string | undefined>): Env {
  return envSchema.parse(env);
}
