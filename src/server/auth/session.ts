import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/server/auth/auth";
import { prisma } from "@/server/db/prisma";

export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session) return null;
  return prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, image: true, clubId: true, clubRole: true },
  });
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireActionUser() {
  const user = await getCurrentUser();
  if (!user) throw new AuthenticationRequiredError();
  return user;
}

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("Sign in to continue.");
    this.name = "AuthenticationRequiredError";
  }
}
