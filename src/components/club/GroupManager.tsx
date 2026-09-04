"use client";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deactivateGroup, saveGroup } from "@/server/actions/club-actions";
import s from "@/app/core.module.css";

type Group = {
  id: string;
  name: string;
  description: string | null;
  ageFrom: number | null;
  ageTo: number | null;
  isActive: boolean;
  memberCount: number;
  nextTraining: string | null;
  locationId: string | null;
  locationName: string | null;
  locationIsActive: boolean | null;
};
const fmt = (value: string) =>
  new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Kyiv",
  }).format(new Date(value));

export default function GroupManager({
  groups,
  locations,
  selectedLocation,
}: {
  groups: Group[];
  locations: { id: string; name: string }[];
  selectedLocation: string;
}) {
  const [editing, setEditing] = useState<Group | null | "create">(null);
  const [notice, setNotice] = useState("");
  const [filterPending, startFilter] = useTransition();
  const router = useRouter();
  return (
    <>
      <div className={s.heading}>
        <div>
          <p className={s.eyebrow}>Команди</p>
          <h1>Групи</h1>
          <p>{groups.filter((g) => g.isActive).length} активних груп</p>
        </div>
        <div className={s.headingActions}>
          <Link className={s.buttonGhost} href="/groups/locations">
            Локації
          </Link>
          <Link className={s.buttonGhost} href="/athletes">
            Спортсмени
          </Link>
          <button className={s.button} onClick={() => setEditing("create")}>
            + Створити групу
          </button>
        </div>
      </div>
      <div className={s.groupFilters}>
        <label htmlFor="group-location-filter">
          Локація
          <select
            id="group-location-filter"
            aria-label="Фільтрувати групи за локацією"
            value={selectedLocation}
            disabled={filterPending}
            onChange={(event) => {
              const value = event.target.value;
              startFilter(() =>
                router.replace(value ? `/groups?location=${encodeURIComponent(value)}` : "/groups"),
              );
            }}
          >
            <option value="">Усі локації</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </label>
        {filterPending && (
          <span className={s.filterStatus} role="status">
            Оновлення…
          </span>
        )}
      </div>
      {notice && (
        <div className={s.toast} role="status">
          {notice}
        </div>
      )}
      {groups.length ? (
        <div className={s.grid}>
          {groups.map((g) => (
            <article
              key={g.id}
              className={`${s.card} ${s.groupCard} ${!g.isActive ? s.cancelled : ""}`}
            >
              <button
                className={s.settingsButton}
                aria-label={`Налаштування групи ${g.name}`}
                onClick={() => setEditing(g)}
              >
                <Gear />
              </button>
              <Link href={`/groups/${g.id}`} className={s.groupCardLink}>
                <span className={s.badge}>
                  {g.isActive ? `${g.memberCount} учасників` : "Неактивна"}
                </span>
                <h3>{g.name}</h3>
                <p>{g.description ?? "Без опису"}</p>
                <p className={s.groupLocation}>
                  {g.locationName ?? "Локацію не закріплено"}
                  {g.locationName && g.locationIsActive === false ? " · Неактивна" : ""}
                </p>
                <p className={s.nextTraining}>
                  Наступне: {g.nextTraining ? fmt(g.nextTraining) : "не заплановано"}
                </p>
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <div className={s.empty}>
          <strong>У вас ще немає груп</strong>Створіть першу групу, щоб додати спортсменів.
        </div>
      )}
      <GroupDialog
        group={editing}
        locations={locations}
        onClose={() => setEditing(null)}
        onSaved={(message) => {
          setEditing(null);
          setNotice(message);
          setTimeout(() => setNotice(""), 3000);
        }}
      />
    </>
  );
}
function GroupDialog({
  group,
  locations,
  onClose,
  onSaved,
}: {
  group: Group | null | "create";
  locations: { id: string; name: string }[];
  onClose: () => void;
  onSaved: (m: string) => void;
}) {
  const dialog = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  useEffect(() => {
    if (!group) return;
    const previous = document.activeElement as HTMLElement | null;
    close.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && dialog.current) {
        const nodes = [
          ...dialog.current.querySelectorAll<HTMLElement>(
            "button:not([disabled]),input,textarea,select,a[href]",
          ),
        ];
        if (!nodes.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [group, onClose]);
  if (!group) return null;
  const editing = group !== "create";
  const submit = (form: FormData) =>
    start(async () => {
      const result = await saveGroup(form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
      onSaved(editing ? "Налаштування групи оновлено" : "Групу створено");
    });
  const deactivate = () => {
    if (!editing || !confirm(`Деактивувати групу «${group.name}»? Історія тренувань збережеться.`))
      return;
    start(async () => {
      const fd = new FormData();
      fd.set("id", group.id);
      await deactivateGroup(fd);
      router.refresh();
      onSaved("Групу деактивовано");
    });
  };
  return (
    <div
      className={s.modalBackdrop}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialog}
        className={s.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="group-dialog-title"
      >
        <div className={s.modalHeader}>
          <div>
            <h2 id="group-dialog-title">{editing ? "Налаштування групи" : "Нова група"}</h2>
            <p>
              {editing
                ? "Оновіть основну інформацію або статус групи."
                : "Додайте назву та віковий діапазон."}
            </p>
          </div>
          <button ref={close} className={s.closeButton} onClick={onClose} aria-label="Закрити">
            ×
          </button>
        </div>
        <form action={submit} className={s.form}>
          {editing && <input type="hidden" name="id" value={group.id} />}
          <div className={s.field}>
            <label htmlFor="group-name">Назва *</label>
            <input
              id="group-name"
              name="name"
              required
              minLength={2}
              defaultValue={editing ? group.name : ""}
            />
          </div>
          <div className={s.field}>
            <label htmlFor="group-description">Опис</label>
            <textarea
              id="group-description"
              name="description"
              defaultValue={editing ? (group.description ?? "") : ""}
            />
          </div>
          <div className={s.formGrid}>
            <div className={s.field}>
              <label htmlFor="ageFrom">Вік від</label>
              <input
                id="ageFrom"
                name="ageFrom"
                type="number"
                min="1"
                defaultValue={editing ? (group.ageFrom ?? "") : ""}
              />
            </div>
            <div className={s.field}>
              <label htmlFor="ageTo">Вік до</label>
              <input
                id="ageTo"
                name="ageTo"
                type="number"
                min="1"
                defaultValue={editing ? (group.ageTo ?? "") : ""}
              />
            </div>
          </div>
          <div className={s.field}>
            <label htmlFor="group-location">Основна локація</label>
            <select
              id="group-location"
              name="locationId"
              defaultValue={editing ? (group.locationId ?? "") : ""}
            >
              <option value="">Не закріплено</option>
              {editing && group.locationId && group.locationIsActive === false && (
                <option value={group.locationId}>{group.locationName} (неактивна)</option>
              )}
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>
          {error && (
            <p className={s.formError} role="alert">
              {error}
            </p>
          )}
          <div className={s.modalActions}>
            {editing && group.isActive && (
              <button type="button" className={s.danger} onClick={deactivate} disabled={pending}>
                Деактивувати
              </button>
            )}
            <span className={s.actionSpacer} />
            <button type="button" className={s.buttonGhost} onClick={onClose}>
              Скасувати
            </button>
            <button className={s.button} disabled={pending}>
              {pending ? "Збереження…" : editing ? "Зберегти" : "Створити"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
function Gear() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 15.3a3.3 3.3 0 1 0 0-6.6 3.3 3.3 0 0 0 0 6.6Z" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.86 2.86-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .98V21h-4v-.62a1.7 1.7 0 0 0-1-.98 1.7 1.7 0 0 0-1.88.34l-.06.06-2.86-2.86.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.98-1H3v-4h.62a1.7 1.7 0 0 0 .98-1 1.7 1.7 0 0 0-.34-1.88l-.06-.06L7.06 4.2l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.98V3h4v.62a1.7 1.7 0 0 0 1 .98 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.86 2.86-.06.06A1.7 1.7 0 0 0 19.4 9c.14.42.5.78.98 1H21v4h-.62c-.47.22-.84.58-.98 1Z" />
    </svg>
  );
}
