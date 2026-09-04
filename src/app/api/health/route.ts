import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { env } from "@/server/env";
import { captureException } from "@/server/observability/error-monitor";

export async function GET() {
  const requestId = crypto.randomUUID();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      { status: "ok", database: "reachable", version: env.APP_VERSION },
      { headers: { "x-request-id": requestId, "cache-control": "no-store" } },
    );
  } catch (error) {
    captureException(error, { requestId, route: "/api/health" });
    return NextResponse.json(
      { status: "degraded", database: "unreachable", version: env.APP_VERSION },
      { status: 503, headers: { "x-request-id": requestId, "cache-control": "no-store" } },
    );
  }
}
