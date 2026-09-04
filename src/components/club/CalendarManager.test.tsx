// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CalendarManager from "./CalendarManager";

const { cancelTraining, restoreTraining, refresh } = vi.hoisted(() => ({
  cancelTraining: vi.fn(async () => ({ ok: true })),
  restoreTraining: vi.fn(async () => ({ ok: true })),
  refresh: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/server/actions/club-actions", () => ({
  cancelTraining,
  restoreTraining,
  saveTraining: vi.fn(async () => ({ ok: true })),
}));

describe("CalendarManager", () => {
  beforeEach(() => {
    cancelTraining.mockClear();
    restoreTraining.mockClear();
    refresh.mockClear();
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });
  it("keeps cancelled training visible with a clear badge and overview link", () => {
    render(
      <CalendarManager
        groups={[]}
        locations={[]}
        trainings={[
          {
            id: "training-1",
            startsAt: "2030-09-03T15:00:00.000Z",
            endsAt: "2030-09-03T16:00:00.000Z",
            groupName: "Juniors",
            locationName: "Головна зала",
            present: 0,
            status: "CANCELLED",
            canCancel: false,
          },
        ]}
      />,
    );
    expect(screen.getByText("Скасовано")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Огляд" }).getAttribute("href")).toBe(
      "/trainings/training-1",
    );
    expect(screen.queryByRole("button", { name: "Видалити" })).toBeNull();
    expect(screen.getByRole("button", { name: "Відновити" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Скасувати" })).toBeNull();
  });
  it("cancels an eligible scheduled training from its row", async () => {
    render(
      <CalendarManager
        groups={[]}
        locations={[]}
        trainings={[
          {
            id: "t2",
            startsAt: "2030-09-03T15:00:00.000Z",
            endsAt: null,
            groupName: "Juniors",
            locationName: null,
            present: 0,
            status: "SCHEDULED",
            canCancel: true,
          },
        ]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Скасувати" }));
    expect(screen.queryByRole("button", { name: "Відновити" })).toBeNull();
    const dialog = screen.getByRole("alertdialog");
    expect(dialog.textContent).toContain("Juniors");
    fireEvent.click(dialog.querySelectorAll("button")[1]);
    await waitFor(() => expect(cancelTraining).toHaveBeenCalledOnce());
    expect(refresh).toHaveBeenCalledOnce();
  });
  it("restores a cancelled training after confirmation", async () => {
    render(
      <CalendarManager
        groups={[]}
        locations={[]}
        trainings={[
          {
            id: "cancelled-1",
            startsAt: "2030-09-03T15:00:00.000Z",
            endsAt: null,
            groupName: "Black Fox Minis",
            locationName: null,
            present: 4,
            status: "CANCELLED",
            canCancel: false,
          },
        ]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Відновити" }));
    const dialog = screen.getByRole("alertdialog");
    expect(dialog.textContent).toContain("Black Fox Minis");
    expect(dialog.textContent).toContain("3 вересня 2030");
    fireEvent.click(dialog.querySelectorAll("button")[1]);
    await waitFor(() => expect(restoreTraining).toHaveBeenCalledOnce());
    expect(refresh).toHaveBeenCalledOnce();
    expect((await screen.findByRole("status")).textContent).toContain("Тренування відновлено");
  });
  it("does not restore when confirmation is declined", () => {
    render(
      <CalendarManager
        groups={[]}
        locations={[]}
        trainings={[
          {
            id: "cancelled-2",
            startsAt: "2030-09-03T15:00:00.000Z",
            endsAt: null,
            groupName: "Juniors",
            locationName: null,
            present: 0,
            status: "CANCELLED",
            canCancel: false,
          },
        ]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Відновити" }));
    const dialog = screen.getByRole("alertdialog");
    fireEvent.click(dialog.querySelectorAll("button")[0]);
    expect(restoreTraining).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });
});
