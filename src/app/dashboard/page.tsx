import Link from "next/link";
import { getDashboardData } from "@/server/club/club-data";
import { getTrainingWindow } from "@/lib/trainings/training-window";
import s from "../core.module.css";
const time = (d: Date) =>
  new Intl.DateTimeFormat("uk-UA", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Kyiv",
  }).format(d);
export default async function Dashboard() {
  const { club, groups, today } = await getDashboardData();
  const now = new Date();
  return (
    <div className={s.page}>
      <div className={s.heading}>
        <div>
          <p className={s.eyebrow}>{club.name}</p>
          <h1>Добрий день 👋</h1>
          <p>Ось що відбувається у клубі сьогодні.</p>
        </div>
      </div>
      <section className={s.today}>
        <div className={s.sectionTitle}>
          <h2>Сьогодні</h2>
          <span className={s.muted}>
            {new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "long" }).format(new Date())}
          </span>
        </div>
        <div className={s.todayList}>
          {today.length ? (
            today.map((t) => {
              const state = getTrainingWindow(t, now);
              const active = state === "READY" || state === "LIVE";
              const status =
                state === "READY"
                  ? "Можна починати"
                  : state === "LIVE"
                    ? "Триває зараз"
                    : state === "CANCELLED"
                      ? "Скасовано"
                      : state === "FINISHED"
                        ? "Завершено"
                        : `Доступне за 30 хв до початку`;
              return (
                <div
                  className={`${s.training} ${active ? s.trainingActive : s.trainingInactive}`}
                  key={t.id}
                >
                  <span className={s.time}>{time(t.startsAt)}</span>
                  <div>
                    <h3>{t.group.name}</h3>
                    <p>
                      {t.location ?? "Локацію не вказано"} · {t.group._count.memberships}{" "}
                      спортсменів
                    </p>
                    <span className={active ? s.liveStatus : s.trainingStatus}>{status}</span>
                  </div>
                  {active ? (
                    <Link className={s.button} href={`/trainings/${t.id}?mode=now`}>
                      {state === "LIVE" ? "Відкрити тренування" : "Почати тренування"} →
                    </Link>
                  ) : (
                    <Link className={s.secondaryLink} href={`/trainings/${t.id}`}>
                      Переглянути деталі
                    </Link>
                  )}
                </div>
              );
            })
          ) : (
            <div className={s.empty}>
              <strong>Сьогодні тренувань немає</strong>Нові заняття можна створити в календарі.
            </div>
          )}
        </div>
      </section>
      <section className={s.section}>
        <div className={s.sectionTitle}>
          <h2>Групи</h2>
          <Link className={s.muted} href="/groups">
            Керувати →
          </Link>
        </div>
        <div className={s.grid}>
          {groups.map((g) => (
            <Link className={`${s.card} ${s.cardLink}`} href={`/groups/${g.id}`} key={g.id}>
              <span className={s.badge}>{g._count.memberships} учасників</span>
              <h3 style={{ marginTop: 14 }}>{g.name}</h3>
              <p>{g.description ?? "Активна група"}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
