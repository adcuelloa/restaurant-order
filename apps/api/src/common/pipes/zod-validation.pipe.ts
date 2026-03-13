import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from "@nestjs/common";
import { z } from "zod";

/**
 * Zod validation pipe. Throws ZodError so AllExceptionsFilter
 * returns structured validation errors (path + message per issue).
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: z.ZodType) {}

  transform(value: unknown, _metadata: ArgumentMetadata): unknown {
    const result = this.schema.safeParse(value);
    if (result.success) {
      return result.data;
    }
    throw result.error;
  }
}

/**
 * Pipe for PATCH/updates: rejects empty body, then validates with Zod.
 */
@Injectable()
export class ZodUpdatePipe implements PipeTransform {
  constructor(private readonly schema: z.ZodType) {}

  transform(value: unknown, _metadata: ArgumentMetadata): unknown {
    if (!value || typeof value !== "object" || Object.keys(value as object).length === 0) {
      throw new BadRequestException("No update data provided.");
    }
    const result = this.schema.safeParse(value);
    if (result.success) {
      return result.data;
    }
    throw result.error;
  }
}

/**
 * Factory for use with @Body(ZodValidationPipe.create(schema)), etc.
 */
export function createZodValidationPipe<T>(schema: z.ZodType<T>): ZodValidationPipe {
  return new ZodValidationPipe(schema);
}
