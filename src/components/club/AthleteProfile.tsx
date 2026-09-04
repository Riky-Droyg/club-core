"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deactivateAthlete, saveAthlete } from "@/server/actions/club-actions";
import s from "@/app/core.module.css";
type Athlete = {
  id: string;
  firstName: string;
  lastName: string | null;
  birthDate: string | null;
  parentName: string | null;
  parentPhone: string | null;
  note: string | null;
  isActive: boolean;
  groupId: string;
};
export default function AthleteProfile({
  athlete,
  groups,
}: {
  athlete: Athlete;
  groups: { id: string; name: string }[];
}) {
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();
  const enable = () => {
    if (confirm("Увімкнути редагування даних спортсмена?")) setEditing(true);
  };
  const submit = (form: FormData) =>
    start(async () => {
      const result = await saveAthlete(form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  const deactivate = () => {
    if (!confirm("Видалити спортсмена з активного складу? Історія відвідуваності збережеться."))
      return;
    start(async () => {
      const form = new FormData();
      form.set("id", athlete.id);
      await deactivateAthlete(form);
      router.push(`/groups/${athlete.groupId}?tab=members`);
      router.refresh();
    });
  };
  return (
    <section className={`${s.card} ${s.athleteInfoCard}`}>
      <div className={s.sectionTitle}>
        <h2>Особисті дані</h2>
        {!editing && athlete.isActive && (
          <button className={s.buttonGhost} onClick={enable}>
            Редагувати
          </button>
        )}
      </div>
      <form action={submit} className={s.form}>
        <input type="hidden" name="id" value={athlete.id} />
        <div className={s.formGrid}>
          <label className={s.field}>
            Ім’я
            <input name="firstName" defaultValue={athlete.firstName} disabled={!editing} required />
          </label>
          <label className={s.field}>
            Прізвище
            <input
              name="lastName"
              defaultValue={athlete.lastName ?? ""}
              disabled={!editing}
              required
              minLength={2}
            />
          </label>
        </div>
        <label className={s.field}>
          Дата народження
          <input
            name="birthDate"
            type="date"
            defaultValue={athlete.birthDate ?? ""}
            disabled={!editing}
          />
        </label>
        <label className={s.field}>
          Група
          <select name="groupId" defaultValue={athlete.groupId} disabled={!editing}>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          {!editing && <input type="hidden" name="groupId" value={athlete.groupId} />}
        </label>
        <div className={s.formGrid}>
          <label className={s.field}>
            Ім’я батьків
            <input name="parentName" defaultValue={athlete.parentName ?? ""} disabled={!editing} />
          </label>
          <label className={s.field}>
            Телефон батьків
            <input
              name="parentPhone"
              type="tel"
              defaultValue={athlete.parentPhone ?? ""}
              disabled={!editing}
              required
              pattern="\+?[0-9 ()-]{7,30}"
              title="Введіть коректний номер телефону"
            />
          </label>
        </div>
        <label className={s.field}>
          Примітка
          <textarea name="note" defaultValue={athlete.note ?? ""} disabled={!editing} />
        </label>
        {error && <p className={s.formError}>{error}</p>}
        {editing && (
          <div className={s.modalActions}>
            <span className={s.actionSpacer} />
            <button type="button" className={s.buttonGhost} onClick={() => setEditing(false)}>
              Скасувати
            </button>
            <button className={s.button} disabled={pending}>
              {pending ? "Збереження…" : "Зберегти"}
            </button>
          </div>
        )}
      </form>
      {athlete.isActive && (
        <div className={s.deactivateZone}>
          <div>
            <strong>Видалити спортсмена</strong>
            <p>Спортсмен зникне з активних груп, але історія залишиться.</p>
          </div>
          <button className={s.danger} onClick={deactivate} disabled={pending}>
            Видалити
          </button>
        </div>
      )}
    </section>
  );
}
