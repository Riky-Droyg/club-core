import { env } from "@/server/env";
import { logger } from "./logger";
import * as Sentry from "@sentry/nextjs";
import { randomUUID } from "node:crypto";

export function captureException(error: unknown, context: Record<string, unknown> = {}) {
  const requestId = typeof context.requestId === "string" ? context.requestId : randomUUID();
  logger.error("unhandled_exception", {
    ...context,
    requestId,
    errorName: error instanceof Error ? error.name : "UnknownError",
  });
  if (env.SENTRY_DSN) {
    const safeError = new Error("Internal application error");
    safeError.name = error instanceof Error ? error.name : "UnknownError";
    Sentry.captureException(safeError, { tags: { requestId } });
  }
}
