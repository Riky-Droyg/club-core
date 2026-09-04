"use client";
import { useEffect, useRef } from "react";
import s from "@/app/core.module.css";
export default function ConfirmDialog({
  open,
  type = "warning",
  title,
  description,
  confirmLabel,
  pending,
  error,
  onConfirm,
  onClose,
}: {
  open: boolean;
  type?: "danger" | "warning" | "success" | "info";
  title: string;
  description: string;
  confirmLabel: string;
  pending?: boolean;
  error?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    close.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) onClose();
      if (e.key === "Tab" && box.current) {
        const nodes = [...box.current.querySelectorAll<HTMLElement>("button:not([disabled])")];
        const first = nodes[0],
          last = nodes.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [open, pending, onClose]);
  if (!open) return null;
  return (
    <div
      className={s.modalBackdrop}
      onMouseDown={(e) => e.target === e.currentTarget && !pending && onClose()}
    >
      <div
        ref={box}
        className={s.confirmDialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
      >
        <div className={`${s.confirmIcon} ${s[`confirm_${type}`]}`}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path
              d={
                type === "danger"
                  ? "M9 9l6 6m0-6-6 6"
                  : type === "success"
                    ? "m8 12 2.5 2.5L16 9"
                    : "M12 7v6m0 4h.01"
              }
            />
          </svg>
        </div>
        <h2 id="confirm-title">{title}</h2>
        <p>{description}</p>
        {error && (
          <p className={s.formError} role="alert">
            {error}
          </p>
        )}
        <div className={s.modalActions}>
          <span className={s.actionSpacer} />
          <button ref={close} className={s.buttonGhost} disabled={pending} onClick={onClose}>
            Скасувати
          </button>
          <button
            className={type === "danger" ? s.danger : s.button}
            disabled={pending}
            onClick={onConfirm}
          >
            {pending ? "Виконання…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
