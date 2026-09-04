import CalendarManager from "@/components/club/CalendarManager";
import { getTrainings } from "@/server/club/club-data";
import { getTrainingWindow } from "@/lib/trainings/training-window";
import s from "../core.module.css";
export default async function Calendar({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const data = await getTrainings(await searchParams);
  const { trainings, groups, locations } = data;
  return (
    <div className={s.page}>
      <CalendarManager
        groups={groups}
        locations={locations}
        query={data.query}
        hasMore={data.hasMore}
        trainings={trainings.map((t) => ({
          id: t.id,
          startsAt: t.startsAt.toISOString(),
          endsAt: t.endsAt?.toISOString() ?? null,
          groupName: t.group.name,
          locationName: t.venue?.name ?? t.location,
          present: t.attendance.filter((a) => a.status === "PRESENT").length,
          status: t.status,
          canCancel: t.status === "SCHEDULED" && getTrainingWindow(t) !== "FINISHED",
        }))}
      />
    </div>
  );
}
