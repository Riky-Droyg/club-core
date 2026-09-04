// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Toast from "./Toast";

describe("Toast", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("can be closed manually", () => {
    const close = vi.fn();
    render(<Toast message="Готово" onClose={close} />);
    fireEvent.click(screen.getByRole("button", { name: "Закрити повідомлення" }));
    expect(close).toHaveBeenCalledOnce();
  });

  it("closes automatically after three seconds", () => {
    vi.useFakeTimers();
    const close = vi.fn();
    render(<Toast message="Готово" onClose={close} />);
    vi.advanceTimersByTime(2999);
    expect(close).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(close).toHaveBeenCalledOnce();
  });
});
