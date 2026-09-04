import AthleteManager from "@/components/club/AthleteManager";
import { getAthletes, getGroups } from "@/server/club/club-data";
import s from "../core.module.css";

export default async function AthletesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const query = await searchParams;
  const [athletes, groups] = await Promise.all([getAthletes(query), getGroups()]);
  return (
    <div className={s.page}>
      <AthleteManager
        athletes={athletes.map((a) => ({ ...a, birthDate: a.birthDate?.toISOString() ?? null }))}
        groups={groups.filter((g) => g.isActive).map((g) => ({ id: g.id, name: g.name }))}
        query={{ q: query.q ?? "", status: query.status ?? "all", group: query.group ?? "" }}
      />
    </div>
  );
}
