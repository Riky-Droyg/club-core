import { describe, expect, it } from "vitest";
import { PAGE_SIZE, parseTrainingQuery } from "./training-query";
describe("training query", () => {
  it("validates period and bounds pagination", () => {
    const q = parseTrainingQuery(
      { period: "invalid", page: "9999" },
      new Date("2026-08-29T12:00:00Z"),
    );
    expect(q.period).toBe("this-month");
    expect(q.page).toBe(1);
    expect(q.take).toBe(PAGE_SIZE);
    expect(q.skip).toBe(0);
  });
  it("supports a valid page", () =>
    expect(parseTrainingQuery({ page: "3" }).skip).toBe(PAGE_SIZE * 2));
});
