// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AthleteManager from "./AthleteManager";

const { deactivateAthlete, refresh } = vi.hoisted(() => ({
  deactivateAthlete: vi.fn(async () => ({ ok: true })),
  refresh: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, replace: vi.fn() }),
}));
vi.mock("@/server/actions/club-actions", () => ({
  saveAthlete: vi.fn(async () => ({ ok: true })),
  activateAthlete: vi.fn(async () => ({ ok: true })),
  deactivateAthlete,
}));

const athlete = {
  id: "athlete-1",
  firstName: "Олена",
  lastName: "Коваль",
  birthDate: null,
  parentName: null,
  parentPhone: "+380671234567",
  isActive: true,
  memberships: [{ group: { id: "group-1", name: "Juniors" } }],
};

describe("AthleteManager safety actions", () => {
  afterEach(() => {
    cleanup();
    deactivateAthlete.mockClear();
    refresh.mockClear();
  });

  it("offers deactivation instead of permanent deletion", () => {
    render(
      <AthleteManager
        athletes={[athlete]}
        groups={[]}
        query={{ q: "", status: "all", group: "" }}
      />,
    );
    expect(screen.getByRole("button", { name: "Деактивувати" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Видалити/ })).toBeNull();
  });

  it("does not call the action when confirmation is declined", () => {
    render(
      <AthleteManager
        athletes={[athlete]}
        groups={[]}
        query={{ q: "", status: "all", group: "" }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Деактивувати" }));
    fireEvent.click(screen.getByRole("button", { name: "Скасувати" }));
    expect(deactivateAthlete).not.toHaveBeenCalled();
  });

  it("deactivates only after custom confirmation", async () => {
    render(
      <AthleteManager
        athletes={[athlete]}
        groups={[]}
        query={{ q: "", status: "all", group: "" }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Деактивувати" }));
    const dialog = screen.getByRole("alertdialog");
    expect(dialog.textContent).toContain("усіх активних груп");
    fireEvent.click(within(dialog).getByRole("button", { name: "Деактивувати" }));
    await waitFor(() => expect(deactivateAthlete).toHaveBeenCalledOnce());
  });
});
