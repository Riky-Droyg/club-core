"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { activateAthlete, deleteAthlete, saveAthlete } from "@/server/actions/club-actions";
import s from "@/app/core.module.css";
import Toast from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

type Athlete = {
  id: string;
  firstName: string;
  lastName: string | null;
  birthDate: string | null;
  parentName: string | null;
  parentPhone: string | null;
  isActive: boolean;
  memberships: { group: { id: string; name: string } }[];
};
export default function AthleteManager({
  athletes,
  groups,
  query,
}: {
  athletes: Athlete[];
  groups: { id: string; name: string }[];
  query: { q: string; status: string; group: string };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");
  const [deleting, setDeleting] = useState<Athlete | null>(null);
  const [activating, setActivating] = useState<Athlete | null>(null);
  const [activationGroup, setActivationGroup] = useState("");
  const apply = (key: string, value: string) => {
    const p = new URLSearchParams({ ...query, [key]: value });
    [...p.entries()].forEach(([k, v]) => {
      if (!v || (k === "status" && v === "all")) p.delete(k);
    });
    start(() => router.replace(p.size ? `/athletes?${p}` : "/athletes"));
  };
  const submit = (form: FormData) =>
    start(async () => {
      const r = await saveAthlete(form);
      if (!r.ok) return setMessage(r.error);
      setOpen(false);
      setMessage("Спортсмена створено");
      router.refresh();
    });
  const activate = (id: string) => {
    const f = new FormData();
    f.set("id", id);
    f.set("groupId", activationGroup);
    start(async () => {
      const r = await activateAthlete(f);
      setMessage(r.ok ? "Спортсмена активовано" : r.error);
      if (r.ok) {
        setActivating(null);
        setActivationGroup("");
        router.refresh();
      }
    });
  };
  const remove = () => {
    if (!deleting) return;
    const form = new FormData();
    form.set("id", deleting.id);
    start(async () => {
      const result = await deleteAthlete(form);
      if (!result.ok) return setMessage(result.error);
      setMessage("Спортсмена повністю видалено");
      setDeleting(null);
      router.refresh();
    });
  };
  return (
    <>
      <div className={s.heading}>
        <div>
          <p className={s.eyebrow}>Клуб</p>
          <h1>Спортсмени</h1>
          <p>{athletes.length} профілів</p>
        </div>
        <button className={s.button} onClick={() => setOpen(true)}>
          + Новий спортсмен
        </button>
      </div>
      <div className={s.calendarFilters}>
        <label>
          Пошук
          <input
            aria-label="Пошук спортсменів"
            defaultValue={query.q}
            onBlur={(e) => apply("q", e.target.value)}
          />
        </label>
        <label>
          Статус
          <select
            aria-label="Статус спортсмена"
            value={query.status}
            onChange={(e) => apply("status", e.target.value)}
          >
            <option value="all">Усі</option>
            <option value="active">Активні</option>
            <option value="inactive">Неактивні</option>
          </select>
        </label>
        <label>
          Група
          <select
            aria-label="Група спортсмена"
            value={query.group}
            onChange={(e) => apply("group", e.target.value)}
          >
            <option value="">Усі групи</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
        {pending && <span className={s.filterStatus}>Оновлення…</span>}
      </div>
      {message && <Toast message={message} onClose={() => setMessage("")} />}
      <div className={s.memberList}>
        {athletes.map((a) => {
          const active = a.isActive && a.memberships.length > 0;
          return (
            <article className={s.member} key={a.id}>
              <span className={s.initial}>
                {a.firstName[0]}
                {a.lastName?.[0]}
              </span>
              <div>
                <strong>
                  {a.firstName} {a.lastName}
                </strong>
                <small>
                  {a.memberships.map((m) => m.group.name).join(" · ") || "Без активної групи"} ·{" "}
                  {active ? "Активний" : "Неактивний"}
                </small>
              </div>
              <div className={`${s.right} ${s.rowActions}`}>
                <Link className={s.buttonGhost} href={`/athletes/${a.id}`}>
                  Огляд
                </Link>
                {!active && (
                  <button className={s.buttonGhost} onClick={() => setActivating(a)}>
                    Активувати
                  </button>
                )}
                <button className={s.dangerCompact} onClick={() => setDeleting(a)}>
                  Видалити
                </button>
              </div>
            </article>
          );
        })}
      </div>
      {open && (
        <div
          className={s.modalBackdrop}
          onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className={s.modal} role="dialog" aria-modal="true" aria-labelledby="new-athlete">
            <div className={s.modalHeader}>
              <div>
                <h2 id="new-athlete">Новий спортсмен</h2>
                <p>Створіть клубний профіль. Групу можна додати пізніше.</p>
              </div>
              <button className={s.closeButton} onClick={() => setOpen(false)} aria-label="Закрити">
                ×
              </button>
            </div>
            <form action={submit} className={s.form}>
              <div className={s.formGrid}>
                <label className={s.field}>
                  Ім’я *<input name="firstName" required minLength={2} />
                </label>
                <label className={s.field}>
                  Прізвище *
                  <input name="lastName" required minLength={2} />
                </label>
              </div>
              <label className={s.field}>
                Дата народження
                <input type="date" name="birthDate" />
              </label>
              <div className={s.formGrid}>
                <label className={s.field}>
                  Контактна особа
                  <input name="parentName" />
                </label>
                <label className={s.field}>
                  Телефон *
                  <input
                    name="parentPhone"
                    type="tel"
                    required
                    minLength={7}
                    pattern="\+?[0-9 ()-]{7,30}"
                    title="Введіть коректний номер телефону"
                    placeholder="+380 67 123 45 67"
                  />
                </label>
              </div>
              <label className={s.field}>
                Група
                <select name="groupId">
                  <option value="">Без групи</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={s.field}>
                Примітка
                <textarea name="note" />
              </label>
              <div className={s.modalActions}>
                <span className={s.actionSpacer} />
                <button type="button" className={s.buttonGhost} onClick={() => setOpen(false)}>
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
      <ConfirmDialog
        open={Boolean(deleting)}
        type="danger"
        title="Повністю видалити спортсмена?"
        description={`Профіль ${deleting?.firstName ?? ""} ${deleting?.lastName ?? ""}, членства та історію відвідуваності буде остаточно видалено із системи.`}
        confirmLabel="Видалити назавжди"
        pending={pending}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
      />
      {activating && (
        <div
          className={s.modalBackdrop}
          onMouseDown={(e) => e.target === e.currentTarget && setActivating(null)}
        >
          <div
            className={s.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="activate-athlete"
          >
            <div className={s.modalHeader}>
              <div>
                <h2 id="activate-athlete">Активувати спортсмена</h2>
                <p>Оберіть групу, до якої повернеться {activating.firstName}.</p>
              </div>
              <button
                className={s.closeButton}
                onClick={() => setActivating(null)}
                aria-label="Закрити"
              >
                ×
              </button>
            </div>
            <div className={s.form}>
              <label className={s.field}>
                Група *
                <select
                  value={activationGroup}
                  onChange={(e) => setActivationGroup(e.target.value)}
                  required
                >
                  <option value="">Оберіть групу</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className={s.modalActions}>
                <span className={s.actionSpacer} />
                <button className={s.buttonGhost} onClick={() => setActivating(null)}>
                  Скасувати
                </button>
                <button
                  className={s.button}
                  disabled={!activationGroup || pending}
                  onClick={() => activate(activating.id)}
                >
                  {pending ? "Активація…" : "Активувати"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
