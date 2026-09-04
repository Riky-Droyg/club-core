// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GroupManager from "./GroupManager";

const { refresh, replace } = vi.hoisted(() => ({ refresh: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, replace }) }));
vi.mock("@/server/actions/club-actions", () => ({
  saveGroup: vi.fn(async () => ({ ok: true })),
  deactivateGroup: vi.fn(async () => ({ ok: true })),
}));
const group = {
  id: "g1",
  name: "Juniors",
  description: "Demo",
  ageFrom: 10,
  ageTo: 15,
  isActive: true,
  memberCount: 24,
  nextTraining: null,
  locationId: null,
  locationName: null,
  locationIsActive: null,
};
describe("GroupManager modal", () => {
  beforeEach(() => {
    refresh.mockClear();
    replace.mockClear();
  });
  afterEach(cleanup);
  it("opens settings without navigating the group card and closes with Escape", async () => {
    render(<GroupManager groups={[group]} locations={[]} selectedLocation="" />);
    const trigger = screen.getByRole("button", { name: "Налаштування групи Juniors" });
    trigger.focus();
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog", { name: "Налаштування групи" })).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(trigger);
  });
  it("opens create group as a modal", () => {
    render(<GroupManager groups={[]} locations={[]} selectedLocation="" />);
    fireEvent.click(screen.getByRole("button", { name: /Створити групу/ }));
    expect(screen.getByRole("dialog", { name: "Нова група" })).toBeTruthy();
  });
  it("filters immediately with router.replace and has no filter button", () => {
    render(
      <GroupManager groups={[]} locations={[{ id: "l1", name: "Зала" }]} selectedLocation="" />,
    );
    expect(screen.queryByRole("button", { name: "Фільтрувати" })).toBeNull();
    fireEvent.change(screen.getByLabelText("Фільтрувати групи за локацією"), {
      target: { value: "l1" },
    });
    expect(replace).toHaveBeenCalledWith("/groups?location=l1");
  });
  it("returns to /groups for all locations", () => {
    render(
      <GroupManager groups={[]} locations={[{ id: "l1", name: "Зала" }]} selectedLocation="l1" />,
    );
    fireEvent.change(screen.getByLabelText("Фільтрувати групи за локацією"), {
      target: { value: "" },
    });
    expect(replace).toHaveBeenCalledWith("/groups");
  });
});
