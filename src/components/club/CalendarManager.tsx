"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelTraining, restoreTraining, saveTraining } from "@/server/actions/club-actions";
import s from "@/app/core.module.css";
import Toast from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
type Training = {
  id: string;
  startsAt: string;
  endsAt: string | null;
  groupName: string;
  locationName: string | null;
  present: number;
  status: string;
  canCancel: boolean;
};
const day = (v: string) =>
  new Intl.DateTimeFormat("uk-UA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Kyiv",
  }).format(new Date(v));
const time = (v: string) =>
  new Intl.DateTimeFormat("uk-UA", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Kyiv",
  }).format(new Date(v));
export default function CalendarManager({
  trainings,
  groups,
  locations,
  query = { period: "month", status: "scheduled", group: "", location: "", page: 1 },
  hasMore = false,
}: {
  trainings: Training[];
  groups: { id: string; name: string }[];
  locations: { id: string; name: string; address: string | null }[];
  query?: { period: string; status: string; group: string; location: string; page: number };
  hasMore?: boolean;
}) {
  const [modal, setModal] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [operation, setOperation] = useState<{
    trainingId: string;
    action: "cancel" | "restore";
  } | null>(null);
  const [confirmation, setConfirmation] = useState<{
    training: Training;
    action: "cancel" | "restore";
  } | null>(null);
  const router = useRouter();
  const filter = (key: string, value: string) => {
    const params = new URLSearchParams();
    const next = { ...query, [key]: value, page: key === "page" ? Number(value) : 1 };
    if (next.period !== "month") params.set("period", next.period);
    if (next.status !== "scheduled") params.set("status", next.status);
    if (next.group) params.set("group", next.group);
    if (next.location) params.set("location", next.location);
    if (next.page > 1) params.set("page", String(next.page));
    start(() => router.replace(params.size ? `/calendar?${params}` : "/calendar"));
  };
  const submitTraining = (form: FormData) =>
    start(async () => {
      const r = await saveTraining(form);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setModal(false);
      router.refresh();
    });
  const runStatusAction = (training: Training, action: "cancel" | "restore") => {
    const f = new FormData();
    f.set("id", training.id);
    setOperation({ trainingId: training.id, action });
    setError("");
    start(async () => {
      const result = action === "cancel" ? await cancelTraining(f) : await restoreTraining(f);
      if (!result.ok) {
        setError(result.error);
        setOperation(null);
        return;
      }
      setNotice(action === "cancel" ? "Тренування скасовано" : "Тренування відновлено");
      setOperation(null);
      setConfirmation(null);
      router.refresh();
    });
  };
  const confirmationText = confirmation
    ? (() => {
        const training = confirmation.training;
        const formatted = new Intl.DateTimeFormat("uk-UA", {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Europe/Kyiv",
        }).format(new Date(training.startsAt));
        return confirmation.action === "cancel"
          ? `Скасувати тренування для групи “${training.groupName}” на ${formatted}? Тренування залишиться в календарі та історії відвідуваності.`
          : `Відновити тренування для групи “${training.groupName}” на ${formatted}? Воно знову стане активним у календарі.`;
      })()
    : "";
  const rows = trainings.map((training, index) => ({
    training,
    label: day(training.startsAt),
    show: index === 0 || day(trainings[index - 1].startsAt) !== day(training.startsAt),
  }));
  return (
    <>
      <div className={s.heading}>
        <div>
          <p className={s.eyebrow}>Розклад</p>
          <h1>Календар</h1>
          <p>Тренування клубу за датами</p>
        </div>
        <div className={s.headingActions}>
          <button className={s.button} onClick={() => setModal(true)}>
            + Створити тренування
          </button>
        </div>
      </div>
      <div className={s.calendarFilters}>
        <label>
          Період
          <select
            aria-label="Період"
            value={query.period}
            onChange={(e) => filter("period", e.target.value)}
          >
            <option value="today">Сьогодні</option>
            <option value="week">Тиждень</option>
            <option value="month">Місяць</option>
            <option value="year">Рік</option>
          </select>
        </label>
        <label>
          Статус
          <select
            aria-label="Статус"
            value={query.status}
            onChange={(e) => filter("status", e.target.value)}
          >
            <option value="all">Усі</option>
            <option value="scheduled">Заплановані</option>
            <option value="cancelled">Скасовані</option>
            <option value="completed">Завершені</option>
          </select>
        </label>
        <label>
          Група
          <select
            aria-label="Група"
            value={query.group}
            onChange={(e) => filter("group", e.target.value)}
          >
            <option value="">Усі групи</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Локація
          <select
            aria-label="Локація"
            value={query.location}
            onChange={(e) => filter("location", e.target.value)}
          >
            <option value="">Усі локації</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        {(query.period !== "month" ||
          query.status !== "scheduled" ||
          query.group ||
          query.location) && (
          <button
            className={s.buttonGhost}
            onClick={() => start(() => router.replace("/calendar"))}
          >
            Очистити
          </button>
        )}
        {pending && <span className={s.filterStatus}>Оновлення…</span>}
      </div>
      <div className={s.calendarList}>
        {notice && <Toast message={notice} onClose={() => setNotice("")} />}
        {error && (
          <p className={s.formError} role="alert">
            {error}
          </p>
        )}
        {rows.map(({ training: t, label, show }) => {
          return (
            <div key={t.id}>
              {show && <h2 className={s.calendarDate}>{label}</h2>}
              <article className={`${s.member} ${t.status === "CANCELLED" ? s.cancelled : ""}`}>
                <span className={s.time}>{time(t.startsAt)}</span>
                <Link href={`/trainings/${t.id}`} className={s.trainingLink}>
                  <strong>
                    {t.groupName}
                    {t.status === "CANCELLED" && (
                      <span className={s.cancelledBadge}>Скасовано</span>
                    )}
                  </strong>
                  <small>
                    {t.locationName ?? "Без локації"} · {t.present} присутні
                  </small>
                </Link>
                <div className={`${s.right} ${s.rowActions}`}>
                  <Link className={s.buttonGhost} href={`/trainings/${t.id}`}>
                    Огляд
                  </Link>
                  {t.canCancel && t.status === "SCHEDULED" && (
                    <button
                      className={s.dangerCompact}
                      disabled={operation?.trainingId === t.id}
                      onClick={() => setConfirmation({ training: t, action: "cancel" })}
                    >
                      {operation?.trainingId === t.id && operation.action === "cancel"
                        ? "Скасування…"
                        : "Скасувати"}
                    </button>
                  )}
                  {t.status === "CANCELLED" && (
                    <button
                      className={s.buttonGhost}
                      disabled={operation?.trainingId === t.id}
                      onClick={() => setConfirmation({ training: t, action: "restore" })}
                    >
                      {operation?.trainingId === t.id && operation.action === "restore"
                        ? "Відновлення…"
                        : "Відновити"}
                    </button>
                  )}
                </div>
              </article>
            </div>
          );
        })}
        {!trainings.length && (
          <div className={s.empty}>
            <strong>Тренувань ще немає</strong>Створіть перше тренування.
          </div>
        )}
      </div>
      {hasMore && (
        <button className={s.buttonGhost} onClick={() => filter("page", String(query.page + 1))}>
          Показати ще
        </button>
      )}
      <ConfirmDialog
        open={Boolean(confirmation)}
        type={confirmation?.action === "restore" ? "success" : "warning"}
        title={confirmation?.action === "restore" ? "Відновити тренування" : "Скасувати тренування"}
        description={confirmationText}
        confirmLabel={confirmation?.action === "restore" ? "Відновити" : "Скасувати"}
        pending={Boolean(operation)}
        error={error}
        onClose={() => setConfirmation(null)}
        onConfirm={() =>
          confirmation && runStatusAction(confirmation.training, confirmation.action)
        }
      />
      {modal && (
        <div
          className={s.modalBackdrop}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModal(false);
          }}
        >
          <div
            className={s.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="calendar-modal-title"
          >
            <div className={s.modalHeader}>
              <div>
                <h2 id="calendar-modal-title">Нове тренування</h2>
                <p>Заплануйте заняття для групи.</p>
              </div>
              <button
                className={s.closeButton}
                onClick={() => setModal(false)}
                aria-label="Закрити"
              >
                ×
              </button>
            </div>
            <form action={submitTraining} className={s.form}>
              <label className={s.field}>
                Група *
                <select name="groupId" required>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className={s.formGrid}>
                <label className={s.field}>
                  Дата *
                  <input
                    name="date"
                    type="date"
                    required
                    defaultValue={new Date().toISOString().slice(0, 10)}
                  />
                </label>
                <label className={s.field}>
                  Початок *<input name="startTime" type="time" required defaultValue="18:00" />
                </label>
              </div>
              <label className={s.field}>
                Завершення
                <input name="endTime" type="time" />
              </label>
              <label className={s.field}>
                Локація
                <select name="locationId">
                  <option value="">Не вказано</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </label>
              {!locations.length && (
                <p className={s.formHint}>
                  Активних локацій немає. Додайте їх у розділі{" "}
                  <Link href="/groups/locations">«Групи → Локації»</Link>.
                </p>
              )}
              <label className={s.field}>
                Примітка
                <textarea name="note" />
              </label>
              {error && <p className={s.formError}>{error}</p>}
              <div className={s.modalActions}>
                <span className={s.actionSpacer} />
                <button type="button" className={s.buttonGhost} onClick={() => setModal(false)}>
                  Скасувати
                </button>
                <button className={s.button} disabled={pending}>
                  Створити
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
