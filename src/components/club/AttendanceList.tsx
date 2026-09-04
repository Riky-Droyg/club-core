"use client";
import { useState, useTransition } from "react";
import { setAttendance } from "@/server/actions/club-actions";
import s from "@/app/core.module.css";
type Status = "UNMARKED" | "PRESENT" | "ABSENT";
type Athlete = { id: string; name: string; status: Status };
const label = { UNMARKED: "Не відмічено", PRESENT: "Присутній/я", ABSENT: "Відсутній/я" };
export default function AttendanceList({
  trainingId,
  athletes,
  disabled = false,
}: {
  trainingId: string;
  athletes: Athlete[];
  disabled?: boolean;
}) {
  const [items, setItems] = useState(athletes);
  const [error, setError] = useState("");
  const [undo, setUndo] = useState<Athlete[] | null>(null);
  const [pending, start] = useTransition();
  function update(id: string, status: Status) {
    const before = items;
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, status } : x)));
    setError("");
    start(async () => {
      try {
        await setAttendance(trainingId, id, status);
      } catch {
        setItems(before);
        setError("Не вдалося зберегти. Спробуйте ще раз.");
      }
    });
  }
  function markAll() {
    const before = items;
    setUndo(before);
    const changed = items.filter((x) => x.status === "UNMARKED");
    setItems((xs) => xs.map((x) => (x.status === "UNMARKED" ? { ...x, status: "PRESENT" } : x)));
    start(async () => {
      try {
        await Promise.all(changed.map((x) => setAttendance(trainingId, x.id, "PRESENT")));
      } catch {
        setItems(before);
        setError("Не всі зміни збережено.");
      }
    });
  }
  function restore() {
    if (!undo) return;
    const current = items;
    setItems(undo);
    const changed = undo.filter((x, i) => x.status !== current[i].status);
    start(async () => {
      await Promise.all(changed.map((x) => setAttendance(trainingId, x.id, x.status)));
    });
    setUndo(null);
  }
  const count = (st: Status) => items.filter((x) => x.status === st).length;
  return (
    <>
      <div className={s.summary}>
        <span className={s.present}>✓ {count("PRESENT")} присутні</span>
        <span className={s.absent}>× {count("ABSENT")} відсутні</span>
        <span>· {count("UNMARKED")} не відмічено</span>
      </div>
      <div className={s.quick}>
        <button className={s.button} onClick={markAll} disabled={disabled || !count("UNMARKED")}>
          Всі присутні
        </button>
        {undo && (
          <button className={s.undo} onClick={restore}>
            Скасувати
          </button>
        )}
        <span className={error ? s.saveError : s.saveState}>
          {error || (pending ? "Збереження…" : "Збережено")}
        </span>
      </div>
      <div className={s.attendanceList}>
        {items.map((a) => (
          <button
            disabled={disabled}
            key={a.id}
            className={s.athleteRow}
            data-status={a.status}
            onClick={() =>
              update(
                a.id,
                a.status === "UNMARKED"
                  ? "PRESENT"
                  : a.status === "PRESENT"
                    ? "ABSENT"
                    : "UNMARKED",
              )
            }
            aria-label={`${a.name}: ${label[a.status]}. Натисніть для зміни статусу`}
          >
            <span className={s.initial}>
              {a.name
                .split(" ")
                .map((x) => x[0])
                .join("")
                .slice(0, 2)}
            </span>
            <span>
              <strong>{a.name}</strong>
              <small>{label[a.status]}</small>
            </span>
            <span>{a.status === "PRESENT" ? "✓" : a.status === "ABSENT" ? "×" : "·"}</span>
          </button>
        ))}
      </div>
    </>
  );
}
