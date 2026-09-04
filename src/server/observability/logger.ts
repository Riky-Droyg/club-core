type LogLevel = "info" | "warn" | "error";
type LogContext = Record<string, unknown>;

const allowedKeys = new Set([
  "requestId",
  "route",
  "operation",
  "errorName",
  "errorCode",
  "category",
  "provider",
  "status",
  "durationMs",
]);
const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const bearerPattern = /bearer\s+[a-z0-9._~-]+/gi;
const sensitiveAssignment = /(password|secret|token|cookie|authorization)=([^\s&]+)/gi;

export function sanitizeLogContext(context: LogContext) {
  return Object.fromEntries(
    Object.entries(context)
      .filter(([key]) => allowedKeys.has(key))
      .map(([key, value]) => {
        if (typeof value !== "string") return [key, value];
        const withoutQuery = value.replace(/(https?:\/\/[^\s?]+)\?[^\s]*/gi, "$1?[REDACTED]");
        return [
          key,
          withoutQuery
            .replace(emailPattern, "[REDACTED_EMAIL]")
            .replace(bearerPattern, "Bearer [REDACTED]")
            .replace(sensitiveAssignment, "$1=[REDACTED]"),
        ];
      }),
  );
}

function write(level: LogLevel, event: string, context: LogContext = {}) {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...sanitizeLogContext(context),
  });
  if (level === "error") console.error(entry);
  else if (level === "warn") console.warn(entry);
  else console.info(entry);
}

export const logger = {
  info: (event: string, context?: LogContext) => write("info", event, context),
  warn: (event: string, context?: LogContext) => write("warn", event, context),
  error: (event: string, context?: LogContext) => write("error", event, context),
};
