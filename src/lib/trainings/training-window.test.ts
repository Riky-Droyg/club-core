import { describe, expect, it } from "vitest";
import { canOpenTraining, getTrainingWindow } from "./training-window";
const date = (value: string) => new Date(value);
const training = {
  startsAt: date("2026-08-29T15:00:00Z"),
  endsAt: date("2026-08-29T16:00:00Z"),
  status: "SCHEDULED" as const,
};
describe("training window", () => {
  it("opens exactly 30 minutes before", () =>
    expect(canOpenTraining(training, date("2026-08-29T14:30:00Z"))).toBe(true));
  it("remains open exactly 30 minutes after end", () =>
    expect(canOpenTraining(training, date("2026-08-29T16:30:00Z"))).toBe(true));
  it("closes after the end grace period", () =>
    expect(getTrainingWindow(training, date("2026-08-29T16:30:00.001Z"))).toBe("FINISHED"));
  it("uses startsAt when endsAt is missing", () =>
    expect(canOpenTraining({ ...training, endsAt: null }, date("2026-08-29T15:30:00Z"))).toBe(
      true,
    ));
  it("never opens a cancelled training", () =>
    expect(
      getTrainingWindow({ ...training, status: "CANCELLED" }, date("2026-08-29T15:10:00Z")),
    ).toBe("CANCELLED"));
});
