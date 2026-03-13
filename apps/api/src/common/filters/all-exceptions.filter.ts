import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Request, Response } from "express";
import { ZodError } from "zod";
import { ApplicationError } from "../application-error";
import { PiiMaskingLogger } from "../../config/logger";

const REQUEST_ID_HEADER = "x-request-id";

/** Public error response. */
export interface ErrorResponse {
  statusCode: number;
  message: string;
  error?: string;
  requestId?: string;
  data?: null;
  details?: unknown;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new PiiMaskingLogger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = this.getRequestId(request) ?? `fallback-${Date.now()}`;
    response.setHeader("X-Request-Id", requestId);
    const { statusCode, body } = this.normalize(exception, requestId);

    if (statusCode >= 500) {
      this.logger.error(
        { err: exception, requestId, path: request.url },
        exception instanceof Error ? exception.stack : undefined
      );
    }

    response.status(statusCode).json(body);
  }

  private getRequestId(request: Request): string | undefined {
    const id = request.headers[REQUEST_ID_HEADER];
    if (typeof id === "string") return id;
    if (Array.isArray(id) && id[0]) return id[0];
    return undefined;
  }

  private normalize(
    exception: unknown,
    requestId: string
  ): { statusCode: number; body: ErrorResponse } {
    const body: ErrorResponse = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: "Internal server error",
      requestId,
      data: null,
    };

    if (exception instanceof ZodError) {
      body.statusCode = HttpStatus.BAD_REQUEST;
      body.message = "Validation failed";
      body.error = "Bad Request";
      body.details = exception.issues.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      }));
      return { statusCode: body.statusCode, body };
    }

    if (exception instanceof ApplicationError) {
      body.statusCode = exception.statusCode;
      body.message = exception.message;
      body.error = exception.code ?? exception.name;
      return { statusCode: exception.statusCode, body };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      body.statusCode = status;
      body.error = exception.name;
      if (typeof res === "string") {
        body.message = res;
      } else if (typeof res === "object" && res !== null && "message" in res) {
        const msg = (res as { message?: string | string[] }).message;
        body.message = Array.isArray(msg) ? msg.join(", ") : ((msg as string) ?? body.message);
        if ("error" in res) body.error = (res as { error?: string }).error;
      }
      return { statusCode: status, body };
    }

    if (exception instanceof Error) {
      body.message = exception.message;
    }

    return { statusCode: body.statusCode, body };
  }
}
