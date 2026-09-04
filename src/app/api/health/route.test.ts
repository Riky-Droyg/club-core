import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryRaw, captureException } = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  captureException: vi.fn(),
}));

vi.mock("@/server/db/prisma", () => ({ prisma: { $queryRaw: queryRaw } }));
vi.mock("@/server/env", () => ({ env: { APP_VERSION: "test-version" } }));
vi.mock("@/server/observability/error-monitor", () => ({ captureException }));

import { GET } from "./route";

describe("health endpoint", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns readiness details when PostgreSQL is reachable", async () => {
    queryRaw.mockResolvedValueOnce([{ "?column?": 1 }]);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-request-id")).toBeTruthy();
    await expect(response.json()).resolves.toEqual({
      status: "ok",
      database: "reachable",
      version: "test-version",
    });
  });

  it("returns 503 without exposing database errors", async () => {
    queryRaw.mockRejectedValueOnce(new Error("postgresql://secret@database/internal"));
    const response = await GET();
    expect(response.status).toBe(503);
    expect(captureException).toHaveBeenCalledOnce();
    await expect(response.json()).resolves.toEqual({
      status: "degraded",
      database: "unreachable",
      version: "test-version",
    });
  });
});
