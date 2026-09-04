import Link from "next/link";
import s from "@/app/core.module.css";

export type AthleteListItem = {
  id: string;
  firstName: string;
  lastName: string | null;
  birthDate: string | null;
  parentName: string | null;
  parentPhone: string | null;
  isActive: boolean;
  memberships: { group: { id: string; name: string } }[];
};

export default function AthleteRow({
  athlete,
  onActivate,
  onDeactivate,
}: {
  athlete: AthleteListItem;
  onActivate: () => void;
  onDeactivate: () => void;
}) {
  const active = athlete.isActive && athlete.memberships.length > 0;
  return (
    <article className={s.member}>
      <span className={s.initial}>
        {athlete.firstName[0]}
        {athlete.lastName?.[0]}
      </span>
      <div>
        <strong>
          {athlete.firstName} {athlete.lastName}
        </strong>
        <small>
          {athlete.memberships.map((membership) => membership.group.name).join(" · ") ||
            "Без активної групи"}{" "}
          · {active ? "Активний" : "Неактивний"}
        </small>
      </div>
      <div className={`${s.right} ${s.rowActions}`}>
        <Link className={s.buttonGhost} href={`/athletes/${athlete.id}`}>
          Огляд
        </Link>
        {!active && (
          <button className={s.buttonGhost} onClick={onActivate}>
            Активувати
          </button>
        )}
        {active && (
          <button className={s.dangerCompact} onClick={onDeactivate}>
            Деактивувати
          </button>
        )}
      </div>
    </article>
  );
}
