import { HttpStatus } from "@nestjs/common";

export class ApplicationError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR,
    public readonly code?: string
  ) {
    super(message);
    this.name = "ApplicationError";
    Object.setPrototypeOf(this, ApplicationError.prototype);
  }
}
