// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import TrainingDetails from "./TrainingDetails";

vi.mock("@/server/actions/club-actions", () => ({
  deleteTraining: vi.fn(),
  saveTraining: vi.fn(async () => ({ ok: true })),
}));

const scheduled = {
  id: "training-1",
  groupId: "group-1",
  startsAt: "2030-09-03T15:00:00.000Z",
  endsAt: "2030-09-03T16:00:00.000Z",
  locationId: null,
  note: null,
  status: "SCHEDULED",
};
const props = { groups: [{ id: "group-1", name: "Black Fox Juniors" }], locations: [] };

describe("TrainingDetails actions", () => {
  afterEach(() => {
    cleanup();
  });

  it("keeps permanent deletion but no longer offers cancellation", () => {
    render(<TrainingDetails training={scheduled} {...props} />);
    expect(screen.queryByRole("button", { name: "Скасувати тренування" })).toBeNull();
    expect(screen.getByRole("button", { name: "Видалити" })).toBeTruthy();
  });

  it("does not offer cancellation or editing for a cancelled training", () => {
    render(<TrainingDetails training={{ ...scheduled, status: "CANCELLED" }} {...props} />);
    expect(screen.queryByRole("button", { name: "Скасувати тренування" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Редагувати" })).toBeNull();
    expect(screen.getByRole("button", { name: "Видалити" })).toBeTruthy();
  });
});
