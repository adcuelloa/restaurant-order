/**
 * Central config. Validates env via Zod and exports typed config.
 */

import { validateEnv } from "./env.schema";

const env = validateEnv(process.env);

export const isProd = env.NODE_ENV === "production";
export const isDev = env.NODE_ENV === "development";

export const serverConfig = {
  port: parseInt(process.env.PORT ?? "3000", 10),
};

export const databaseConfig = {
  url: env.MONGODB_URI,
};

export const redisConfig = {
  url: env.REDIS_URL,
};

export { env, validateEnv };
export type { Env } from "./env.schema";
