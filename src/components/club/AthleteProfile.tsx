"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteAthlete, saveAthlete } from "@/server/actions/club-actions";
import s from "@/app/core.module.css";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Toast from "@/components/ui/Toast";
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
  const [notice, setNotice] = useState("");
  const [confirmEdit, setConfirmEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const router = useRouter();
  const enable = () => setConfirmEdit(true);
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
  const remove = () => {
    start(async () => {
      const form = new FormData();
      form.set("id", athlete.id);
      form.set("confirmation", "ВИДАЛИТИ");
      const result = await deleteAthlete(form);
      if (!result.ok) return setError(result.error);
      router.push("/athletes?deleted=1");
    });
  };
  return (
    <section className={`${s.card} ${s.athleteInfoCard}`}>
      {notice && <Toast message={notice} onClose={() => setNotice("")} />}
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
      <div className={s.deactivateZone}>
        <div>
          <strong>Остаточне видалення</strong>
          <p>Профіль і пов’язані дані буде видалено без можливості відновлення.</p>
        </div>
        <button className={s.danger} onClick={() => setConfirmDelete(true)} disabled={pending}>
          Видалити спортсмена
        </button>
      </div>
      <ConfirmDialog
        open={confirmEdit}
        type="info"
        title="Увімкнути редагування?"
        description="Після підтвердження поля профілю стануть доступними для змін."
        confirmLabel="Редагувати"
        onClose={() => setConfirmEdit(false)}
        onConfirm={() => {
          setConfirmEdit(false);
          setEditing(true);
        }}
      />
      <ConfirmDialog
        open={confirmDelete}
        type="danger"
        title="Остаточно видалити спортсмена?"
        description={`Остаточно видалити спортсмена “${athlete.firstName} ${athlete.lastName ?? ""}”? Профіль і пов’язані з ним дані буде видалено із системи. Цю дію неможливо скасувати.`}
        confirmLabel="Видалити назавжди"
        pending={pending}
        error={error}
        verification={{
          label: "Для підтвердження введіть ВИДАЛИТИ",
          expected: "ВИДАЛИТИ",
          placeholder: "ВИДАЛИТИ",
        }}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
      />
    </section>
  );
}
