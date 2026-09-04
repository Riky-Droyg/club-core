// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LocationManager from "./LocationManager";

const { refresh, deactivate, activate, deleteLocation } = vi.hoisted(() => ({
  refresh: vi.fn(),
  deactivate: vi.fn(async () => ({ ok: true, counts: { groups: 2, trainings: 3 } })),
  activate: vi.fn(async () => ({ ok: true, counts: { groups: 2, trainings: 3 } })),
  deleteLocation: vi.fn(async () => ({ ok: true })),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/server/actions/club-actions", () => ({
  createLocation: vi.fn(async () => ({ ok: true })),
  updateLocation: vi.fn(async () => ({ ok: true })),
  deactivateLocation: deactivate,
  activateLocation: activate,
  deleteLocation,
}));

const location = {
  id: "location-1",
  name: "Головна зала",
  address: "вул. Спортивна, 1",
  isActive: true,
  activeGroups: 2,
  upcomingTrainings: 3,
};

describe("LocationManager", () => {
  beforeEach(() => {
    refresh.mockClear();
    deactivate.mockClear();
    activate.mockClear();
    deleteLocation.mockClear();
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("opens the create modal, closes on Escape and restores focus", async () => {
    render(<LocationManager locations={[location]} />);
    const trigger = screen.getByRole("button", { name: /Додати локацію/ });
    trigger.focus();
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog", { name: "Нова локація" })).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(trigger);
  });

  it("opens edit with existing values", () => {
    render(<LocationManager locations={[location]} />);
    fireEvent.click(screen.getByRole("button", { name: "Редагувати" }));
    expect(screen.getByRole("dialog", { name: "Редагувати локацію" })).toBeTruthy();
    expect(screen.getByLabelText("Назва *")).toHaveProperty("value", "Головна зала");
  });

  it("confirms deactivation with usage counts", async () => {
    render(<LocationManager locations={[location]} />);
    fireEvent.click(screen.getByRole("button", { name: "Деактивувати" }));
    expect(confirm).toHaveBeenCalledWith(
      expect.stringContaining("2 активних групах і 3 майбутніх"),
    );
    await waitFor(() => expect(deactivate).toHaveBeenCalledOnce());
  });

  it("allows an inactive location to be activated", async () => {
    render(<LocationManager locations={[{ ...location, isActive: false }]} />);
    fireEvent.click(screen.getByRole("button", { name: "Активувати" }));
    expect(confirm).toHaveBeenCalledWith(
      `Активувати локацію “Головна зала”? Після активації вона знову стане доступною у фільтрах, групах і під час створення тренувань.`,
    );
    await waitFor(() => expect(activate).toHaveBeenCalledOnce());
    expect((await screen.findByRole("status")).textContent).toContain("Локацію активовано");
  });

  it("does not activate when confirmation is declined", () => {
    vi.mocked(confirm).mockReturnValueOnce(false);
    render(<LocationManager locations={[{ ...location, isActive: false }]} />);
    fireEvent.click(screen.getByRole("button", { name: "Активувати" }));
    expect(activate).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });
  it("confirms permanent deletion with usage counts", async () => {
    render(<LocationManager locations={[location]} />);
    fireEvent.click(screen.getByRole("button", { name: "Видалити" }));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("Активні групи: 2"));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("Майбутні тренування: 3"));
    await waitFor(() => expect(deleteLocation).toHaveBeenCalledOnce());
  });
});
