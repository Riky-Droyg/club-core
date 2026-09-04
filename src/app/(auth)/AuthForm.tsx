"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";
import { signInSchema, signUpSchema } from "@/server/validation/auth";
import { safeRedirectPath } from "@/lib/auth/safe-redirect";
import s from "./auth.module.css";

export default function AuthForm({
  mode,
  nextPath = "/projects",
}: {
  mode: "login" | "signup";
  nextPath?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const destination = safeRedirectPath(nextPath);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setUnverifiedEmail("");
    const form = new FormData(event.currentTarget);
    const raw = {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    };
    const parsed = (mode === "signup" ? signUpSchema : signInSchema).safeParse(raw);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the form fields.");
      return;
    }
    setPending(true);
    const result =
      mode === "signup"
        ? await authClient.signUp.email({
            name: raw.name.trim(),
            email: parsed.data.email,
            password: parsed.data.password,
            callbackURL: destination,
          })
        : await authClient.signIn.email({
            email: parsed.data.email,
            password: parsed.data.password,
            callbackURL: destination,
          });
    setPending(false);
    if (result.error) {
      if (result.error.code === "EMAIL_NOT_VERIFIED") setUnverifiedEmail(parsed.data.email);
      setError(
        mode === "signup" && result.error.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL"
          ? "This email is already registered."
          : result.error.message || "Authentication failed.",
      );
      return;
    }
    router.push(destination);
    router.refresh();
  }

  return (
    <main className={s.page}>
      <section className={s.card}>
        <span className={s.brand}>CLUB Core</span>
        <h1>{mode === "signup" ? "Створити акаунт" : "З поверненням"}</h1>
        <p className={s.intro}>
          {mode === "signup"
            ? "Створіть доступ до клубу."
            : "Увійдіть у робочий простір вашого клубу."}
        </p>
        <form className={s.form} onSubmit={submit}>
          {mode === "signup" ? (
            <label>
              Full name
              <input name="name" autoComplete="name" maxLength={80} required />
            </label>
          ) : null}
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Пароль
            <input
              name="password"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              minLength={8}
              maxLength={128}
              required
            />
          </label>
          {mode === "login" ? (
            <Link className={s.forgotLink} href="/forgot-password">
              Забули пароль?
            </Link>
          ) : null}
          {error ? (
            <p className={s.error} role="alert">
              {error}
            </p>
          ) : null}
          {unverifiedEmail ? (
            <button
              className={s.secondaryAction}
              type="button"
              disabled={pending}
              onClick={async () => {
                setPending(true);
                const result = await authClient.sendVerificationEmail({
                  email: unverifiedEmail,
                  callbackURL: destination,
                });
                setPending(false);
                setError(
                  result.error
                    ? result.error.message || "Could not send verification email."
                    : "Verification email sent. Check your inbox.",
                );
              }}
            >
              Resend verification email
            </button>
          ) : null}
          <button className={s.submit} type="submit" disabled={pending}>
            {pending ? "Зачекайте…" : mode === "signup" ? "Створити акаунт" : "Увійти"}
          </button>
        </form>
        {mode === "signup" ? (
          <p className={s.switch}>
            Вже маєте акаунт? <Link href="/login">Увійти</Link>
          </p>
        ) : null}
      </section>
    </main>
  );
}
