"use client";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addAthletesToGroup,
  removeAthleteFromGroup,
  saveAthlete,
} from "@/server/actions/club-actions";
import s from "@/app/core.module.css";
type Member = {
  id: string;
  firstName: string;
  lastName: string | null;
  birthDate: string | null;
  parentName: string | null;
  parentPhone: string | null;
};
export default function MemberManager({
  groupId,
  members,
  candidates,
}: {
  groupId: string;
  members: Member[];
  candidates: {
    id: string;
    firstName: string;
    lastName: string | null;
    parentPhone: string | null;
    isActive: boolean;
    alreadyMember: boolean;
  }[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"select" | "new">("select");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const router = useRouter();
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const triggerElement = trigger.current;
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("keydown", close);
      triggerElement?.focus();
    };
  }, [open]);
  const remove = (id: string, name: string) => {
    if (
      !confirm(
        `Видалити спортсмена «${name}» з активного складу? Історія відвідуваності збережеться.`,
      )
    )
      return;
    start(async () => {
      const form = new FormData();
      form.set("id", id);
      form.set("athleteId", id);
      form.set("groupId", groupId);
      await removeAthleteFromGroup(form);
      router.refresh();
    });
  };
  const submit = (form: FormData) =>
    start(async () => {
      const result = await saveAthlete(form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      setError("");
      router.refresh();
    });
  const addSelected = () =>
    start(async () => {
      const result = await addAthletesToGroup(groupId, selected);
      if (!result.ok) return setError(result.error);
      setOpen(false);
      setSelected([]);
      router.refresh();
    });
  return (
    <>
      <div className={s.memberToolbar}>
        <p>{members.length} спортсменів</p>
        <button ref={trigger} className={s.button} onClick={() => setOpen(true)}>
          + Додати спортсмена
        </button>
      </div>
      <div className={s.memberList}>
        {members.map((m) => {
          const name = `${m.firstName} ${m.lastName ?? ""}`.trim();
          return (
            <article className={s.member} key={m.id}>
              <span className={s.initial}>
                {m.firstName[0]}
                {m.lastName?.[0]}
              </span>
              <div>
                <strong>{name}</strong>
                <small>
                  {m.parentName ?? "Контакт не вказано"}
                  {m.parentPhone ? ` · ${m.parentPhone}` : ""}
                </small>
              </div>
              <div className={`${s.right} ${s.rowActions}`}>
                <Link className={s.buttonGhost} href={`/athletes/${m.id}`}>
                  Огляд
                </Link>
                <button
                  className={s.dangerCompact}
                  onClick={() => remove(m.id, name)}
                  disabled={pending}
                >
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
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            className={s.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="athlete-modal-title"
          >
            <div className={s.modalHeader}>
              <div>
                <h2 id="athlete-modal-title">
                  {mode === "select" ? "Додати спортсменів" : "Новий спортсмен"}
                </h2>
                <p>
                  {mode === "select"
                    ? "Знайдіть і виберіть одного або кількох."
                    : "Профіль буде додано до клубу й групи."}
                </p>
              </div>
              <button className={s.closeButton} onClick={() => setOpen(false)} aria-label="Закрити">
                ×
              </button>
            </div>
            {mode === "select" ? (
              <div className={s.form}>
                <div className={s.memberSearch}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="11" cy="11" r="6" />
                    <path d="m16 16 4 4" />
                  </svg>
                  <input
                    aria-label="Пошук спортсменів"
                    placeholder="Ім’я, прізвище або телефон"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                {selected.length > 0 && (
                  <div className={s.selectedAthletes}>
                    <strong>Вибрано: {selected.length}</strong>
                    <div>
                      {selected.map((id) => {
                        const athlete = candidates.find((item) => item.id === id);
                        return athlete ? (
                          <button
                            key={id}
                            onClick={() =>
                              setSelected((value) => value.filter((item) => item !== id))
                            }
                          >
                            {athlete.firstName} {athlete.lastName}
                            <span>×</span>
                          </button>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
                <div className={s.memberPicker}>
                  {candidates
                    .filter((a) =>
                      `${a.firstName} ${a.lastName ?? ""} ${a.parentPhone ?? ""}`
                        .toLowerCase()
                        .includes(search.toLowerCase()),
                    )
                    .map((a) => (
                      <label
                        key={a.id}
                        className={selected.includes(a.id) ? s.memberPickerActive : ""}
                      >
                        <input
                          type="checkbox"
                          disabled={a.alreadyMember || !a.isActive}
                          checked={selected.includes(a.id)}
                          onChange={() =>
                            setSelected((value) =>
                              value.includes(a.id)
                                ? value.filter((id) => id !== a.id)
                                : [...value, a.id],
                            )
                          }
                        />
                        <span>
                          <strong>
                            {a.firstName} {a.lastName}
                          </strong>
                          <small>
                            {a.alreadyMember
                              ? "Уже в групі"
                              : !a.isActive
                                ? "Неактивний"
                                : a.parentPhone}
                          </small>
                        </span>
                      </label>
                    ))}
                </div>
                {error && <p className={s.formError}>{error}</p>}
                <div className={s.modalActions}>
                  <button className={s.buttonGhost} onClick={() => setMode("new")}>
                    Новий спортсмен
                  </button>
                  <span className={s.actionSpacer} />
                  <button
                    className={s.button}
                    disabled={!selected.length || pending}
                    onClick={addSelected}
                  >
                    Додати вибраних ({selected.length})
                  </button>
                </div>
              </div>
            ) : (
              <form action={submit} className={s.form}>
                <input type="hidden" name="groupId" value={groupId} />
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
                  <input name="birthDate" type="date" />
                </label>
                <div className={s.formGrid}>
                  <label className={s.field}>
                    Ім’я одного з батьків
                    <input name="parentName" />
                  </label>
                  <label className={s.field}>
                    Телефон батьків *
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
                  Примітка
                  <textarea name="note" />
                </label>
                {error && (
                  <p className={s.formError} role="alert">
                    {error}
                  </p>
                )}
                <div className={s.modalActions}>
                  <button type="button" className={s.buttonGhost} onClick={() => setMode("select")}>
                    ← До вибору
                  </button>
                  <span className={s.actionSpacer} />
                  <button type="button" className={s.buttonGhost} onClick={() => setOpen(false)}>
                    Скасувати
                  </button>
                  <button className={s.button} disabled={pending}>
                    {pending ? "Додавання…" : "Додати"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
