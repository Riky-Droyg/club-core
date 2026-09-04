import Link from "next/link";
import LocationManager from "@/components/club/LocationManager";
import { getLocationManagementData } from "@/server/club/club-data";
import s from "../../core.module.css";

export default async function LocationsPage() {
  const locations = await getLocationManagementData();
  return (
    <div className={s.page}>
      <Link href="/groups" className={s.topLink}>
        ← До груп
      </Link>
      <LocationManager
        locations={locations.map((location) => ({
          id: location.id,
          name: location.name,
          address: location.address,
          isActive: location.isActive,
          activeGroups: location._count.groups,
          upcomingTrainings: location._count.trainings,
        }))}
      />
    </div>
  );
}
