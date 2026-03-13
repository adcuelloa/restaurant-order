import { CanActivate, ExecutionContext, Injectable, BadRequestException } from "@nestjs/common";
import { Request } from "express";

export const IDEMPOTENCY_KEY_HEADER = "idempotency-key";

@Injectable()
export class IdempotencyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const key = request.headers[IDEMPOTENCY_KEY_HEADER];
    const value =
      typeof key === "string" ? key.trim() : Array.isArray(key) ? key[0]?.trim() : undefined;
    if (!value) {
      throw new BadRequestException(`Missing required header: ${IDEMPOTENCY_KEY_HEADER}`);
    }
    (request as Request & { idempotencyKey?: string }).idempotencyKey = value;
    return true;
  }
}
