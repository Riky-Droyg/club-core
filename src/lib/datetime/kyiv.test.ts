import { describe, expect, it } from "vitest";
import { formatKyivDateKey, formatKyivTime, kyivDateTimeToUtc, kyivDayRange } from "./kyiv";

describe("Europe/Kyiv date handling", () => {
  it("uses the winter UTC+2 offset", () => {
    expect(kyivDateTimeToUtc("2026-01-15", "18:00").toISOString()).toBe("2026-01-15T16:00:00.000Z");
  });

  it("uses the summer UTC+3 offset", () => {
    expect(kyivDateTimeToUtc("2026-07-15", "18:00").toISOString()).toBe("2026-07-15T15:00:00.000Z");
  });

  it("rejects a wall-clock time skipped by DST", () => {
    expect(() => kyivDateTimeToUtc("2026-03-29", "03:30")).toThrow(/літній час/);
  });

  it("formats dates near UTC midnight in Kyiv", () => {
    const instant = new Date("2026-07-01T21:30:00.000Z");
    expect(formatKyivDateKey(instant)).toBe("2026-07-02");
    expect(formatKyivTime(instant)).toBe("00:30");
  });

  it("builds Kyiv days using DST-aware UTC boundaries", () => {
    const range = kyivDayRange(new Date("2026-07-02T10:00:00.000Z"));
    expect(range.start.toISOString()).toBe("2026-07-01T21:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-07-02T21:00:00.000Z");
  });
});
