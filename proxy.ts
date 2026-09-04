import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/server/auth/auth";

const publicPaths = new Set(["/login", "/signup", "/forgot-password", "/reset-password"]);
const authLandingPaths = new Set(["/login", "/signup"]);

export async function proxy(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  const isPublic = publicPaths.has(request.nextUrl.pathname);

  if (!session && !isPublic) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(login);
  }
  if (session && authLandingPaths.has(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|icons/).*)"],
};
