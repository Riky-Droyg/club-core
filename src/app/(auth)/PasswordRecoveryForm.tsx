"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import s from "./auth.module.css";

export default function PasswordRecoveryForm({
  mode,
  token,
  invalidToken,
}: {
  mode: "request" | "reset";
  token?: string;
  invalidToken?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(invalidToken ? "This reset link is invalid or expired." : "");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    setPending(true);
    if (mode === "request") {
      const result = await authClient.requestPasswordReset({
        email: String(form.get("email") ?? "")
          .trim()
          .toLowerCase(),
        redirectTo: "/reset-password",
      });
      setPending(false);
      if (result.error) return setError(result.error.message || "Could not request a reset link.");
      setMessage("If an account exists for this email, a reset link has been sent.");
      return;
    }
    const password = String(form.get("password") ?? "");
    if (password !== String(form.get("confirmation") ?? "")) {
      setPending(false);
      return setError("Passwords do not match.");
    }
    if (!token) {
      setPending(false);
      return setError("This reset link is invalid or expired.");
    }
    const result = await authClient.resetPassword({ newPassword: password, token });
    setPending(false);
    if (result.error) return setError(result.error.message || "Could not reset the password.");
    router.replace("/login?passwordReset=1");
  }

  return (
    <main className={s.page}>
      <section className={s.card}>
        <span className={s.brand}>TaskFlow</span>
        <h1>{mode === "request" ? "Reset your password" : "Choose a new password"}</h1>
        <p className={s.intro}>
          {mode === "request"
            ? "Enter your account email and we will send a secure reset link."
            : "Use at least 8 characters for your new password."}
        </p>
        <form className={s.form} onSubmit={submit}>
          {mode === "request" ? (
            <label>
              Email
              <input name="email" type="email" autoComplete="email" required />
            </label>
          ) : (
            <>
              <label>
                New password
                <input
                  name="password"
                  type="password"
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  required
                />
              </label>
              <label>
                Confirm password
                <input
                  name="confirmation"
                  type="password"
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  required
                />
              </label>
            </>
          )}
          {error ? (
            <p className={s.error} role="alert">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className={s.success} role="status">
              {message}
            </p>
          ) : null}
          <button className={s.submit} type="submit" disabled={pending || Boolean(invalidToken)}>
            {pending
              ? "Please wait…"
              : mode === "request"
                ? "Send reset link"
                : "Save new password"}
          </button>
        </form>
        <p className={s.switch}>
          <Link href="/login">Back to sign in</Link>
        </p>
      </section>
    </main>
  );
}
