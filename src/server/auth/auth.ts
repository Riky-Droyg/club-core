import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";

import { prisma } from "@/server/db/prisma";
import { env } from "@/server/env";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/server/email/email-service";
import { authRateLimit } from "@/server/auth/rate-limit";

export const auth = betterAuth({
  appName: "CLUB Core",
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    requireEmailVerification: env.APP_ENV === "staging" || env.APP_ENV === "production",
    resetPasswordTokenExpiresIn: 60 * 60,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail(user.email, url);
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60,
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail(user.email, url);
    },
  },
  user: { modelName: "User" },
  session: {
    modelName: "Session",
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  account: { modelName: "Account" },
  verification: { modelName: "Verification" },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => ({
          data: { ...user, name: user.name.trim(), email: user.email.trim().toLowerCase() },
        }),
      },
    },
  },
  rateLimit: authRateLimit,
  advanced: {
    useSecureCookies:
      process.env.NODE_ENV === "production" ||
      env.APP_ENV === "staging" ||
      env.APP_ENV === "production",
  },
  plugins: [nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;
