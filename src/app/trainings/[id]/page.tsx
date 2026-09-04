import Link from "next/link";
import { getGroups, getLocations, getTraining } from "@/server/club/club-data";
import { canOpenTraining, getTrainingWindow } from "@/lib/trainings/training-window";
import AttendanceList from "@/components/club/AttendanceList";
import TrainingDetails from "@/components/club/TrainingDetails";
import s from "../../core.module.css";
export default async function TrainingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { id } = await params;
  const { mode } = await searchParams;
  const [t, groups, locations] = await Promise.all([getTraining(id), getGroups(), getLocations()]);
  const nowMode = mode === "now" && canOpenTraining(t);
  const state = getTrainingWindow(t);
  const statuses = Object.fromEntries(t.attendance.map((a) => [a.athleteId, a.status]));
  return (
    <div className={s.attendancePage}>
      <Link href="/calendar" className={s.topLink}>
        ← До календаря
      </Link>
      <header className={s.attendanceHeader}>
        <div>
          <p className={s.eyebrow}>{nowMode ? "Тренування зараз" : "Тренування"}</p>
          <h1>{t.group.name}</h1>
          <p className={s.muted}>
            {new Intl.DateTimeFormat("uk-UA", {
              day: "numeric",
              month: "long",
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Europe/Kyiv",
            }).format(t.startsAt)}
            {t.venue ? ` · ${t.venue.name}` : t.location ? ` · ${t.location}` : ""}
          </p>
          <p className={s.muted}>{t.group.memberships.length} спортсменів</p>
        </div>
        <span className={s.badge}>
          {t.status === "CANCELLED"
            ? "Скасовано"
            : nowMode
              ? "Autosave"
              : state === "FINISHED"
                ? "Завершено"
                : "Заплановано"}
        </span>
      </header>
      {nowMode ? (
        <AttendanceList
          trainingId={t.id}
          disabled={t.status === "CANCELLED"}
          athletes={t.group.memberships.map((m) => ({
            id: m.athlete.id,
            name: `${m.athlete.firstName} ${m.athlete.lastName ?? ""}`.trim(),
            status: statuses[m.athlete.id] ?? "UNMARKED",
          }))}
        />
      ) : (
        <TrainingDetails
          training={{
            id: t.id,
            groupId: t.groupId,
            startsAt: t.startsAt.toISOString(),
            endsAt: t.endsAt?.toISOString() ?? null,
            locationId: t.locationId,
            note: t.note,
            status: t.status,
          }}
          groups={groups.filter((g) => g.isActive).map((g) => ({ id: g.id, name: g.name }))}
          locations={
            t.venue &&
            !t.venue.isActive &&
            !locations.some((location) => location.id === t.venue?.id)
              ? [{ id: t.venue.id, name: `${t.venue.name} (неактивна)` }, ...locations]
              : locations
          }
        />
      )}
    </div>
  );
}
