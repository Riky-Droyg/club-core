import { env } from "@/server/env";
import { logger } from "@/server/observability/logger";
import nodemailer from "nodemailer";

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
  category: "verification" | "password-reset" | "project-invitation";
};

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character];
  });
}

function safeActionUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:")
    throw new Error("Email action URL must use HTTP or HTTPS.");
  return url.toString();
}

function safeSubject(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

export async function sendEmail(message: EmailMessage) {
  if (env.EMAIL_PROVIDER === "development") {
    logger.info("development_email_suppressed", { category: message.category });
    return { delivered: false, provider: "development" as const };
  }
  if (env.EMAIL_PROVIDER === "mailpit") {
    const transport = nodemailer.createTransport({ host: env.SMTP_HOST, port: env.SMTP_PORT });
    await transport.sendMail({
      from: env.EMAIL_FROM ?? "taskflow@localhost.test",
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    logger.info("email_delivered", { category: message.category, provider: "mailpit" });
    return { delivered: true, provider: "mailpit" as const };
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [message.to],
      subject: message.subject,
      text: message.text,
      html: message.html,
    }),
  });
  if (!response.ok) throw new Error(`Email provider returned HTTP ${response.status}.`);
  logger.info("email_delivered", { category: message.category });
  return { delivered: true, provider: "resend" as const };
}

function actionEmail(title: string, intro: string, action: string, url: string) {
  const href = safeActionUrl(url);
  return {
    text: `${intro}\n\n${action}: ${href}\n\nIf you did not request this, ignore this email.`,
    html: `<h1>${escapeHtml(title)}</h1><p>${escapeHtml(intro)}</p><p><a href="${escapeHtml(href)}">${escapeHtml(action)}</a></p><p>If you did not request this, ignore this email.</p>`,
  };
}

export async function sendVerificationEmail(to: string, url: string) {
  const body = actionEmail(
    "Verify your TaskFlow email",
    "Confirm your email address to secure your account.",
    "Verify email",
    url,
  );
  return sendEmail({
    to,
    subject: "Verify your TaskFlow email",
    category: "verification",
    ...body,
  });
}

export async function sendPasswordResetEmail(to: string, url: string) {
  const body = actionEmail(
    "Reset your TaskFlow password",
    "A password reset was requested for your account.",
    "Reset password",
    url,
  );
  return sendEmail({
    to,
    subject: "Reset your TaskFlow password",
    category: "password-reset",
    ...body,
  });
}

export async function sendProjectInvitationEmail(to: string, projectName: string, url: string) {
  const body = actionEmail(
    `Join ${projectName}`,
    `You were invited to the ${projectName} project in TaskFlow.`,
    "Accept invitation",
    url,
  );
  return sendEmail({
    to,
    subject: safeSubject(`Invitation to ${projectName}`),
    category: "project-invitation",
    ...body,
  });
}
