import Link from "next/link";
import { getAthlete, getGroups } from "@/server/club/club-data";
import AthleteProfile from "@/components/club/AthleteProfile";
import s from "../../core.module.css";
const fmt = (d: Date) =>
  new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Kyiv",
  }).format(d);
export default async function AthletePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [a, groups] = await Promise.all([getAthlete(id), getGroups()]);
  const marked = a.attendance.filter((x) => x.status !== "UNMARKED");
  const rate = marked.length
    ? Math.round((marked.filter((x) => x.status === "PRESENT").length / marked.length) * 100)
    : 0;
  const current = a.memberships[0]?.group;
  return (
    <div className={s.page}>
      <Link href="/athletes" className={s.topLink}>
        ← До спортсменів
      </Link>
      <div className={s.heading} style={{ marginTop: 18 }}>
        <div>
          <p className={s.eyebrow}>{a.isActive ? "Активний спортсмен" : "Неактивний"}</p>
          <h1>
            {a.firstName} {a.lastName}
          </h1>
          <p>{a.memberships.map((m) => m.group.name).join(" · ") || "Без групи"}</p>
        </div>
      </div>
      <div className={s.profileGrid}>
        <AthleteProfile
          athlete={{
            id: a.id,
            firstName: a.firstName,
            lastName: a.lastName,
            birthDate: a.birthDate?.toISOString().slice(0, 10) ?? null,
            parentName: a.parentName,
            parentPhone: a.parentPhone,
            note: a.note,
            isActive: a.isActive,
            groupId: current?.id ?? "",
          }}
          groups={groups.filter((g) => g.isActive).map((g) => ({ id: g.id, name: g.name }))}
        />
        <section className={s.card}>
          <div className={s.sectionTitle}>
            <h2>Відвідуваність</h2>
            <span className={s.badge}>{rate}% присутності</span>
          </div>
          <div className={s.history}>
            {a.attendance.map((x) => (
              <Link className={s.historyItem} href={`/trainings/${x.trainingId}`} key={x.id}>
                <span>
                  {fmt(x.training.startsAt)} · {x.training.group.name}
                </span>
                <span
                  className={
                    x.status === "PRESENT"
                      ? s.present
                      : x.status === "ABSENT"
                        ? s.absent
                        : s.unmarked
                  }
                  style={{ padding: "5px 8px", borderRadius: 8 }}
                >
                  {x.status === "PRESENT"
                    ? "Присутня/ій"
                    : x.status === "ABSENT"
                      ? "Відсутня/ій"
                      : "Не відмічено"}
                </span>
              </Link>
            ))}
            {!a.attendance.length && <div className={s.empty}>Історії ще немає.</div>}
          </div>
        </section>
      </div>
    </div>
  );
}
