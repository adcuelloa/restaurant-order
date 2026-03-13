import { NestFactory } from "@nestjs/core";
import { json } from "express";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { serverConfig } from "./config";
import { PiiMaskingLogger } from "./config/logger";

/** Max request body size per spec (16KB). */
const BODY_SIZE_LIMIT = "16kb";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    bodyParser: false,
  });
  app.use(json({ limit: BODY_SIZE_LIMIT }));
  app.useLogger(new PiiMaskingLogger("NestApplication"));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.setGlobalPrefix("");
  app.enableCors({
    origin: ["http://localhost:5173", "http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Idempotency-Key", "X-Request-Id"],
  });

  await app.listen(serverConfig.port);
  return app;
}

void bootstrap();
