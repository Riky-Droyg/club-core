"use client";
import { useEffect } from "react";
import s from "@/app/core.module.css";
export default function Toast({
  message,
  type = "success",
  onClose,
}: {
  message: string;
  type?: "success" | "error" | "warning" | "info";
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 3000);
    return () => window.clearTimeout(timer);
  }, [message, onClose]);
  return (
    <div
      className={`${s.toast} ${s[`toast_${type}`]}`}
      role={type === "error" ? "alert" : "status"}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d={type === "error" ? "M9 9l6 6m0-6-6 6" : "m8 12 2.5 2.5L16 9"} />
      </svg>
      <span>{message}</span>
      <button aria-label="Закрити повідомлення" onClick={onClose}>
        ×
      </button>
    </div>
  );
}
