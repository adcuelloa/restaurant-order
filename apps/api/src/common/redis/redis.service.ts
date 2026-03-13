import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { createClient, type RedisClientType } from "redis";
import { redisConfig } from "../../config";
import { createLogger } from "../../config/logger";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = createLogger(RedisService.name);
  private client: RedisClientType | null = null;

  async onModuleInit(): Promise<void> {
    this.client = createClient({ url: redisConfig.url });
    this.client.on("error", (err: Error) => {
      this.logger.warn("Redis client error", err.message);
    });
    await this.client.connect();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.client) return null;
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.client) return;
    if (ttlSeconds != null) {
      await this.client.set(key, value, { EX: ttlSeconds });
    } else {
      await this.client.set(key, value);
    }
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    if (raw == null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async setJson(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }
}
