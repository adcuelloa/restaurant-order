/**
 * @module config/logger
 * @summary Application logger using Pino.
 * @description High-performance structured logger. In development uses pino-pretty for readable output; in production emits JSON to stdout.
 */

import { createRequire } from "node:module";
import type { Writable } from "node:stream";
import pino, { type Logger as PinoLogger } from "pino";

import type { LoggerService } from "@nestjs/common";

const isProd = process.env.NODE_ENV === "production";

/** In dev, use pino-pretty for human-readable logs; in prod, raw JSON to stdout. */
function getDestination(): Writable {
  if (isProd) return process.stdout;
  try {
    const require = createRequire(import.meta.url);
    const pretty = require("pino-pretty");
    return pretty({
      colorize: true,
      translateTime: "SYS:yyyy-mm-dd HH:MM:ss",
      ignore: "pid,hostname",
    });
  } catch {
    return process.stdout;
  }
}

// ── PII masking (for PiiMaskingLogger) ──

const PII_FIELDS = ["email", "phone", "name", "password", "token", "authorization"] as const;

function maskEmail(value: string): string {
  const at = value.indexOf("@");
  if (at <= 0) return "[REDACTED]";
  return `${value[0]}***${value.slice(at)}`;
}

function maskName(value: string): string {
  if (value.length === 0) return "[REDACTED]";
  return `${value[0]}***`;
}

function maskPiiValue(key: string, value: unknown): unknown {
  const lowerKey = key.toLowerCase();
  if (typeof value === "string") {
    if (lowerKey.includes("email")) return maskEmail(value);
    if (
      lowerKey.includes("name") &&
      !lowerKey.includes("filename") &&
      !lowerKey.includes("__name")
    ) {
      return maskName(value);
    }
    if (PII_FIELDS.some((pii) => lowerKey.includes(pii))) return "[REDACTED]";
  }
  return maskPii(value);
}

function maskPii(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(maskPii);
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (PII_FIELDS.some((pii) => lowerKey.includes(pii))) {
      result[key] = maskPiiValue(key, value);
    } else {
      result[key] = maskPii(value);
    }
  }
  return result;
}

function formatMessage(message: unknown): string {
  if (typeof message === "string") return message;
  if (message instanceof Error) return message.message;
  return JSON.stringify(maskPii(message));
}

// ── Pino instance ──

const pinoInstance = pino(
  {
    level: process.env.LOG_LEVEL ?? "info",
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  getDestination()
);

export default pinoInstance;

// ── NestJS LoggerService backed by Pino ──

/**
 * NestJS LoggerService that delegates framework logs (InstanceLoader, RouterExplorer, etc.) to Pino.
 */
export class PinoLoggerService implements LoggerService {
  log(message: string, context?: string): void {
    if (context) {
      pinoInstance.info({ context }, message);
    } else {
      pinoInstance.info(message);
    }
  }

  error(message: string, traceOrContext?: string, context?: string): void {
    if (context) {
      pinoInstance.error({ context, trace: traceOrContext }, message);
    } else if (traceOrContext) {
      pinoInstance.error({ context: traceOrContext }, message);
    } else {
      pinoInstance.error(message);
    }
  }

  warn(message: string, context?: string): void {
    if (context) {
      pinoInstance.warn({ context }, message);
    } else {
      pinoInstance.warn(message);
    }
  }

  debug(message: string, context?: string): void {
    if (context) {
      pinoInstance.debug({ context }, message);
    } else {
      pinoInstance.debug(message);
    }
  }

  verbose(message: string, context?: string): void {
    if (context) {
      pinoInstance.trace({ context }, message);
    } else {
      pinoInstance.trace(message);
    }
  }

  fatal(message: string, context?: string): void {
    if (context) {
      pinoInstance.fatal({ context }, message);
    } else {
      pinoInstance.fatal(message);
    }
  }
}

// ── NestJS LoggerService with PII masking ──

/**
 * Nest-compatible logger that masks PII before delegating to Pino.
 * email → a***@domain.com, name → J***, phone/password/token/authorization → [REDACTED].
 */
export class PiiMaskingLogger implements LoggerService {
  private _context?: string;
  private _child: PinoLogger | null = null;

  constructor(context?: string) {
    this._context = context;
  }

  private pinoWithContext(): PinoLogger {
    if (!this._context) return pinoInstance;
    if (this._child == null) this._child = pinoInstance.child({ context: this._context });
    return this._child;
  }

  private logLevel(
    level: "info" | "warn" | "error" | "debug" | "trace",
    message: unknown,
    ...optionalParams: unknown[]
  ): void {
    const safeMessage = formatMessage(message);
    const safeParams = optionalParams.map(maskPii);
    const bind = this.pinoWithContext();
    const payload =
      safeParams.length > 0 ? { msg: safeMessage, extra: safeParams } : { msg: safeMessage };
    switch (level) {
      case "error":
        bind.error(payload);
        break;
      case "warn":
        bind.warn(payload);
        break;
      case "debug":
      case "trace":
        bind.debug(payload);
        break;
      default:
        bind.info(payload);
    }
  }

  log(message: unknown, ...optionalParams: unknown[]): void {
    this.logLevel("info", message, ...optionalParams);
  }

  error(message: unknown, ...optionalParams: unknown[]): void {
    this.logLevel("error", message, ...optionalParams);
  }

  warn(message: unknown, ...optionalParams: unknown[]): void {
    this.logLevel("warn", message, ...optionalParams);
  }

  debug(message: unknown, ...optionalParams: unknown[]): void {
    this.logLevel("debug", message, ...optionalParams);
  }

  verbose(message: unknown, ...optionalParams: unknown[]): void {
    this.logLevel("trace", message, ...optionalParams);
  }

  setContext(context: string): void {
    this._context = context;
    this._child = null;
  }
}

export function createLogger(context?: string): PiiMaskingLogger {
  return new PiiMaskingLogger(context);
}
