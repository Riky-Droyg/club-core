export const authRateLimit = {
  enabled: process.env.DISABLE_AUTH_RATE_LIMIT !== "true",
  storage: "database" as const,
  window: 60,
  max: 20,
  customRules: {
    "/sign-in/email": { window: 60, max: 5 },
    "/sign-up/email": { window: 60 * 60, max: 5 },
    "/request-password-reset": { window: 15 * 60, max: 3 },
    "/send-verification-email": { window: 15 * 60, max: 3 },
  },
};
