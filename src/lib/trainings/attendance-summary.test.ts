import { describe, expect, it } from "vitest";
import { attendanceSummary } from "./attendance-summary";
describe("attendanceSummary", () => {
  it("uses captured attendance as the historical total", () => {
    expect(attendanceSummary([{ status: "PRESENT" }, { status: "ABSENT" }], 12)).toEqual({
      present: 1,
      total: 2,
    });
  });
  it("falls back to current active members", () => {
    expect(attendanceSummary([], 9)).toEqual({ present: 0, total: 9 });
  });
});
