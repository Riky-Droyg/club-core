"use client";
import { useState, useTransition } from "react";
import { deleteTraining, saveTraining } from "@/server/actions/club-actions";
import s from "@/app/core.module.css";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { formatKyivDateKey, formatKyivTime } from "@/lib/datetime/kyiv";
type Training = {
  id: string;
  groupId: string;
  startsAt: string;
  endsAt: string | null;
  locationId: string | null;
  note: string | null;
  status: string;
};
export default function TrainingDetails({
  training,
  groups,
  locations,
}: {
  training: Training;
  groups: { id: string; name: string }[];
  locations: { id: string; name: string }[];
}) {
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState<"edit" | "delete" | null>(null);
  const startEdit = () => setConfirmation("edit");
  const remove = () => {
    const form = new FormData();
    form.set("id", training.id);
    start(() => deleteTraining(form));
  };
  const submit = (form: FormData) =>
    start(async () => {
      const result = await saveTraining(form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEditing(false);
    });
  const starts = new Date(training.startsAt),
    ends = training.endsAt ? new Date(training.endsAt) : null;
  return (
    <section className={`${s.card} ${s.trainingDetailsCard}`}>
      <div className={s.sectionTitle}>
        <h2>Дані тренування</h2>
        {!editing && training.status === "SCHEDULED" && (
          <button className={s.buttonGhost} onClick={startEdit}>
            Редагувати
          </button>
        )}
      </div>
      <form action={submit} className={s.form}>
        <input type="hidden" name="id" value={training.id} />
        <label className={s.field}>
          Група
          <select name="groupId" defaultValue={training.groupId} disabled={!editing}>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          {!editing && <input type="hidden" name="groupId" value={training.groupId} />}
        </label>
        <div className={s.formGrid}>
          <label className={s.field}>
            Дата
            <input
              name="date"
              type="date"
              defaultValue={formatKyivDateKey(starts)}
              disabled={!editing}
            />
            {!editing && <input type="hidden" name="date" value={formatKyivDateKey(starts)} />}
          </label>
          <label className={s.field}>
            Початок
            <input
              name="startTime"
              type="time"
              defaultValue={formatKyivTime(starts)}
              disabled={!editing}
            />
            {!editing && <input type="hidden" name="startTime" value={formatKyivTime(starts)} />}
          </label>
        </div>
        <label className={s.field}>
          Завершення
          <input
            name="endTime"
            type="time"
            defaultValue={ends ? formatKyivTime(ends) : ""}
            disabled={!editing}
          />
        </label>
        <label className={s.field}>
          Локація
          <select name="locationId" defaultValue={training.locationId ?? ""} disabled={!editing}>
            <option value="">Не вказано</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        <label className={s.field}>
          Примітка
          <textarea name="note" defaultValue={training.note ?? ""} disabled={!editing} />
        </label>
        {error && <p className={s.formError}>{error}</p>}
        {editing && (
          <div className={s.modalActions}>
            <span className={s.actionSpacer} />
            <button type="button" className={s.buttonGhost} onClick={() => setEditing(false)}>
              Скасувати
            </button>
            <button className={s.button} disabled={pending}>
              Зберегти
            </button>
          </div>
        )}
      </form>
      <div className={s.deactivateZone}>
        <div>
          <strong>Видалити тренування</strong>
          <p>Разом із тренуванням буде остаточно видалена його відвідуваність.</p>
        </div>
        <div className={s.rowActions}>
          <button className={s.danger} onClick={() => setConfirmation("delete")} disabled={pending}>
            Видалити
          </button>
        </div>
      </div>
      <ConfirmDialog
        open={confirmation === "edit"}
        type="info"
        title="Увімкнути редагування?"
        description="Після підтвердження дані тренування стануть доступними для змін."
        confirmLabel="Редагувати"
        onClose={() => setConfirmation(null)}
        onConfirm={() => {
          setConfirmation(null);
          setEditing(true);
        }}
      />
      <ConfirmDialog
        open={confirmation === "delete"}
        type="danger"
        title="Видалити тренування?"
        description="Тренування та записи відвідуваності буде остаточно видалено. Цю дію неможливо скасувати."
        confirmLabel="Видалити назавжди"
        pending={pending}
        onClose={() => setConfirmation(null)}
        onConfirm={remove}
      />
    </section>
  );
}
