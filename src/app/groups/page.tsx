import GroupManager from "@/components/club/GroupManager";
import { getGroups, getLocations } from "@/server/club/club-data";
import s from "../core.module.css";
export default async function Groups({
  searchParams,
}: {
  searchParams: Promise<{ location?: string }>;
}) {
  const { location = "" } = await searchParams;
  const [groups, locations] = await Promise.all([getGroups(location || undefined), getLocations()]);
  return (
    <div className={s.page}>
      <GroupManager
        locations={locations}
        selectedLocation={location}
        groups={groups.map((g) => ({
          id: g.id,
          name: g.name,
          description: g.description,
          ageFrom: g.ageFrom,
          ageTo: g.ageTo,
          isActive: g.isActive,
          memberCount: g._count.memberships,
          nextTraining: g.trainings[0]?.startsAt.toISOString() ?? null,
          locationId: g.locationId,
          locationName: g.location?.name ?? null,
          locationIsActive: g.location?.isActive ?? null,
        }))}
      />
    </div>
  );
}
