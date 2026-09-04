"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  activateLocation,
  createLocation,
  deactivateLocation,
  deleteLocation,
  updateLocation,
} from "@/server/actions/club-actions";
import s from "@/app/core.module.css";
import Toast from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export type ManagedLocation = {
  id: string;
  name: string;
  address: string | null;
  isActive: boolean;
  activeGroups: number;
  upcomingTrainings: number;
};

export default function LocationManager({ locations }: { locations: ManagedLocation[] }) {
  const [editing, setEditing] = useState<ManagedLocation | "create" | null>(null);
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState("");
  const [changingId, setChangingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{
    location: ManagedLocation;
    action: "activate" | "deactivate" | "delete";
  } | null>(null);
  const router = useRouter();

  const changeStatus = (location: ManagedLocation) => {
    const form = new FormData();
    form.set("id", location.id);
    setChangingId(location.id);
    startTransition(async () => {
      const result = location.isActive
        ? await deactivateLocation(form)
        : await activateLocation(form);
      if (!result.ok) {
        setNotice(result.error);
        setChangingId(null);
        return;
      }
      setNotice(location.isActive ? "Локацію деактивовано" : "Локацію активовано");
      setChangingId(null);
      setConfirmation(null);
      router.refresh();
    });
  };

  const remove = (location: ManagedLocation) => {
    const form = new FormData();
    form.set("id", location.id);
    setDeletingId(location.id);
    startTransition(async () => {
      const result = await deleteLocation(form);
      if (!result.ok) {
        setNotice(result.error);
        setDeletingId(null);
        return;
      }
      setNotice("Локацію видалено");
      setDeletingId(null);
      setConfirmation(null);
      router.refresh();
    });
  };

  return (
    <>
      <div className={s.heading}>
        <div>
          <p className={s.eyebrow}>Групи</p>
          <h1>Локації</h1>
          <p>Зали й майданчики, де проходять тренування</p>
        </div>
        <button className={s.button} onClick={() => setEditing("create")}>
          + Додати локацію
        </button>
      </div>
      {notice && <Toast message={notice} onClose={() => setNotice("")} />}
      {locations.length ? (
        <div className={s.locationList}>
          {locations.map((location) => (
            <article
              className={`${s.locationRow} ${!location.isActive ? s.inactiveRow : ""}`}
              key={location.id}
            >
              <div className={s.locationIdentity}>
                <span className={location.isActive ? s.statusActive : s.statusInactive}>
                  {location.isActive ? "Активна" : "Неактивна"}
                </span>
                <div>
                  <h2>{location.name}</h2>
                  <p>{location.address ?? "Адресу не вказано"}</p>
                </div>
              </div>
              <dl className={s.locationStats}>
                <div>
                  <dt>Активні групи</dt>
                  <dd>{location.activeGroups}</dd>
                </div>
                <div>
                  <dt>Майбутні тренування</dt>
                  <dd>{location.upcomingTrainings}</dd>
                </div>
              </dl>
              <div className={s.rowActions}>
                <button className={s.buttonGhost} onClick={() => setEditing(location)}>
                  Редагувати
                </button>
                <button
                  className={location.isActive ? s.dangerCompact : s.buttonGhost}
                  disabled={pending || changingId === location.id || deletingId === location.id}
                  onClick={() =>
                    setConfirmation({
                      location,
                      action: location.isActive ? "deactivate" : "activate",
                    })
                  }
                >
                  {changingId === location.id
                    ? location.isActive
                      ? "Деактивація…"
                      : "Активація…"
                    : location.isActive
                      ? "Деактивувати"
                      : "Активувати"}
                </button>
                <button
                  className={s.dangerCompact}
                  disabled={pending || deletingId === location.id}
                  onClick={() => setConfirmation({ location, action: "delete" })}
                >
                  {deletingId === location.id ? "Видалення…" : "Видалити"}
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className={s.empty}>
          <strong>Локацій ще немає</strong>
          Додайте першу залу або майданчик для груп і тренувань.
        </div>
      )}
      <LocationDialog
        key={editing === "create" ? "create" : (editing?.id ?? "closed")}
        location={editing}
        onClose={() => setEditing(null)}
        onSaved={(message) => {
          setEditing(null);
          setNotice(message);
          router.refresh();
        }}
      />
      <ConfirmDialog
        open={Boolean(confirmation)}
        type={confirmation?.action === "delete" ? "danger" : "warning"}
        title={
          confirmation?.action === "delete"
            ? "Видалити локацію?"
            : confirmation?.action === "activate"
              ? "Активувати локацію?"
              : "Деактивувати локацію?"
        }
        description={
          confirmation?.action === "activate"
            ? `Активувати локацію “${confirmation.location.name}”? Після активації вона знову стане доступною у фільтрах, групах і під час створення тренувань.`
            : confirmation?.action === "deactivate"
              ? `Деактивувати локацію «${confirmation.location.name}»? Вона використовується у ${confirmation.location.activeGroups} активних групах і ${confirmation.location.upcomingTrainings} майбутніх тренуваннях. Зв’язки та історія будуть збережені.`
              : confirmation
                ? `Видалити локацію “${confirmation.location.name}”? Активні групи: ${confirmation.location.activeGroups}. Майбутні тренування: ${confirmation.location.upcomingTrainings}. Цю дію неможливо скасувати.`
                : ""
        }
        confirmLabel={
          confirmation?.action === "delete"
            ? "Видалити"
            : confirmation?.action === "activate"
              ? "Активувати"
              : "Деактивувати"
        }
        pending={pending}
        onClose={() => setConfirmation(null)}
        onConfirm={() => {
          if (!confirmation) return;
          if (confirmation.action === "delete") remove(confirmation.location);
          else changeStatus(confirmation.location);
        }}
      />
    </>
  );
}

function LocationDialog({
  location,
  onClose,
  onSaved,
}: {
  location: ManagedLocation | "create" | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const isEditing = location !== null && location !== "create";

  useEffect(() => {
    if (!location) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !dialogRef.current) return;
      const items = [
        ...dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), input"),
      ];
      const first = items[0];
      const last = items.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus();
    };
  }, [location, onClose]);

  if (!location) return null;
  const submit = (form: FormData) =>
    startTransition(async () => {
      if (isEditing) form.set("id", location.id);
      const result = isEditing ? await updateLocation(form) : await createLocation(form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSaved(isEditing ? "Локацію оновлено" : "Локацію створено");
    });

  return (
    <div
      className={s.modalBackdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className={s.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="location-dialog-title"
      >
        <div className={s.modalHeader}>
          <div>
            <h2 id="location-dialog-title">{isEditing ? "Редагувати локацію" : "Нова локація"}</h2>
            <p>Назва має бути унікальною в межах вашого клубу.</p>
          </div>
          <button ref={closeRef} className={s.closeButton} onClick={onClose} aria-label="Закрити">
            ×
          </button>
        </div>
        <form action={submit} className={s.form}>
          <div className={s.field}>
            <label htmlFor="location-name">Назва *</label>
            <input
              id="location-name"
              name="name"
              required
              minLength={2}
              maxLength={80}
              autoComplete="off"
              defaultValue={isEditing ? location.name : ""}
            />
          </div>
          <div className={s.field}>
            <label htmlFor="location-address">Адреса</label>
            <input
              id="location-address"
              name="address"
              maxLength={200}
              defaultValue={isEditing ? (location.address ?? "") : ""}
            />
          </div>
          {error && (
            <p className={s.formError} role="alert">
              {error}
            </p>
          )}
          <div className={s.modalActions}>
            <span className={s.actionSpacer} />
            <button type="button" className={s.buttonGhost} onClick={onClose}>
              Скасувати
            </button>
            <button className={s.button} disabled={pending}>
              {pending ? "Збереження…" : "Зберегти"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
