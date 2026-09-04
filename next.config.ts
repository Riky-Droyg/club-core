import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const hardened = process.env.APP_ENV === "staging" || process.env.APP_ENV === "production";
const sentryOrigin = (() => {
  try {
    return process.env.SENTRY_DSN ? new URL(process.env.SENTRY_DSN).origin : "";
  } catch {
    return "";
  }
})();
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${hardened ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self'${hardened ? "" : " ws: http:"}${sentryOrigin ? ` ${sentryOrigin}` : ""}`,
  "form-action 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  turbopack: {
    root: process.cwd(),
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          ...(hardened
            ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
            : []),
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  webpack: { treeshake: { removeDebugLogging: true } },
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
});
