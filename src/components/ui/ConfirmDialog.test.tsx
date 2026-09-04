// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ConfirmDialog from "./ConfirmDialog";

describe("ConfirmDialog", () => {
  afterEach(cleanup);

  it("does not confirm until the verification text matches", () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open
        type="danger"
        title="Остаточне видалення"
        description="Дію неможливо скасувати"
        confirmLabel="Видалити"
        verification={{ label: "Введіть ВИДАЛИТИ", expected: "ВИДАЛИТИ" }}
        onConfirm={onConfirm}
        onClose={vi.fn()}
      />,
    );
    const button = screen.getByRole("button", { name: "Видалити" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Введіть ВИДАЛИТИ"), {
      target: { value: "ВИДАЛИТИ" },
    });
    expect(button.disabled).toBe(false);
    fireEvent.click(button);
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("closes on Escape and does not call the action", () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Підтвердження"
        description="Опис"
        confirmLabel="Так"
        onConfirm={onConfirm}
        onClose={onClose}
      />,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
