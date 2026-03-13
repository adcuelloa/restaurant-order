import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import serverlessExpress from "@vendia/serverless-express";
import { Handler } from "aws-lambda";
import express from "express";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { PiiMaskingLogger } from "./config/logger";
import "./config";

/** Max request body size per spec (16KB). */
const BODY_SIZE_LIMIT = "16kb";

let cachedServer: Handler | undefined;

async function bootstrap(): Promise<Handler> {
  if (cachedServer) {
    return cachedServer;
  }

  const expressApp = express();
  expressApp.use(express.json({ limit: BODY_SIZE_LIMIT }));
  const adapter = new ExpressAdapter(expressApp);
  const app = await NestFactory.create(AppModule, adapter, {
    bufferLogs: true,
  });

  app.useLogger(new PiiMaskingLogger("Lambda"));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.setGlobalPrefix("");
  app.enableCors({
    origin: ["http://localhost:5173", "http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Idempotency-Key", "X-Request-Id"],
  });
  await app.init();

  cachedServer = serverlessExpress({ app: expressApp });
  return cachedServer;
}

export const handler: Handler = async (event, context, callback) => {
  const server = await bootstrap();
  return server(event, context, callback);
};
