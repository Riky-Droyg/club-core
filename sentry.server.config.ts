import * as Sentry from "@sentry/nextjs";
import { scrubSentryEvent } from "@/lib/observability/sentry-privacy";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN),
  environment: process.env.APP_ENV ?? process.env.NODE_ENV,
  release: process.env.APP_VERSION,
  tracesSampleRate: process.env.APP_ENV === "production" ? 0.1 : 1,
  sendDefaultPii: false,
  beforeSend: scrubSentryEvent,
});
