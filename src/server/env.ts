import { z } from "zod";

const optionalString = (schema: z.ZodType<string>) =>
  z.preprocess((value) => (value === "" ? undefined : value), schema.optional());

const schema = z
  .object({
    APP_ENV: z.enum(["local", "test", "staging", "production"]).default("local"),
    APP_VERSION: z.string().max(100).default("development"),
    DATABASE_URL: z.string().min(1),
    DIRECT_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.string().url(),
    EMAIL_PROVIDER: z.enum(["development", "mailpit", "resend"]).default("development"),
    EMAIL_FROM: optionalString(z.string().email()),
    RESEND_API_KEY: optionalString(z.string().min(1)),
    SMTP_HOST: z.string().min(1).default("localhost"),
    SMTP_PORT: z.coerce.number().int().positive().default(1025),
    SENTRY_DSN: optionalString(z.string().url()),
  })
  .superRefine((value, context) => {
    if (value.APP_ENV !== "staging" && value.APP_ENV !== "production") return;
    if (!value.BETTER_AUTH_URL.startsWith("https://"))
      context.addIssue({ code: "custom", path: ["BETTER_AUTH_URL"], message: "must use HTTPS" });
    if (/replace|development|demo|example/i.test(value.BETTER_AUTH_SECRET))
      context.addIssue({
        code: "custom",
        path: ["BETTER_AUTH_SECRET"],
        message: "must be a generated secret",
      });
    if (value.EMAIL_PROVIDER !== "resend")
      context.addIssue({ code: "custom", path: ["EMAIL_PROVIDER"], message: "must be resend" });
    if (!value.EMAIL_FROM)
      context.addIssue({ code: "custom", path: ["EMAIL_FROM"], message: "is required" });
    if (!value.RESEND_API_KEY)
      context.addIssue({ code: "custom", path: ["RESEND_API_KEY"], message: "is required" });
  });
export const env = schema.parse({
  APP_ENV: process.env.APP_ENV,
  APP_VERSION: process.env.APP_VERSION,
  DATABASE_URL: process.env.DATABASE_URL,
  DIRECT_URL: process.env.DIRECT_URL,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
  EMAIL_FROM: process.env.EMAIL_FROM,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SENTRY_DSN: process.env.SENTRY_DSN,
});
