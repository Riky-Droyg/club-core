import Link from "next/link";
import { getAthletes, getGroup, getLocations } from "@/server/club/club-data";
import MemberManager from "@/components/club/MemberManager";
import s from "../../core.module.css";
import { attendanceSummary } from "@/lib/trainings/attendance-summary";
const date = (d: Date) =>
  new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/Kyiv",
  }).format(d);
export default async function GroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    tab?: string;
    period?: string;
    from?: string;
    to?: string;
    page?: string;
    location?: string;
  }>;
}) {
  const { id } = await params;
  const queryParams = await searchParams;
  const { tab = "overview" } = queryParams;
  const [g, locations, athletes] = await Promise.all([
    getGroup(id, queryParams),
    getLocations(),
    getAthletes({ status: "all" }),
  ]);
  const completed = g.trainings.filter((t) => t.status === "COMPLETED" || t.startsAt < new Date());
  const marked = completed.flatMap((t) => t.attendance).filter((a) => a.status !== "UNMARKED");
  const present = marked.filter((a) => a.status === "PRESENT").length;
  const rate = marked.length ? Math.round((present / marked.length) * 100) : 0;
  return (
    <div className={s.page}>
      <Link href="/groups" className={s.topLink}>
        ← До груп
      </Link>
      <div className={s.heading} style={{ marginTop: 18 }}>
        <div>
          <p className={s.eyebrow}>{g.isActive ? "Активна група" : "Неактивна"}</p>
          <h1>{g.name}</h1>
          <p>{g.description ?? `${g.memberships.length} спортсменів`}</p>
        </div>
      </div>
      <nav className={s.tabs}>
        {[
          ["overview", "Огляд"],
          ["members", "Учасники"],
          ["trainings", "Тренування"],
          ["attendance", "Відвідуваність"],
        ].map(([k, l]) => (
          <Link
            key={k}
            href={`/groups/${id}?tab=${k}&period=${g.query.period}`}
            data-active={tab === k}
          >
            {l}
          </Link>
        ))}
      </nav>
      {tab === "overview" && (
        <>
          <div className={s.stats}>
            <div className={s.stat}>
              <strong>{g.memberships.length}</strong>
              <span>Активних спортсменів</span>
            </div>
            <div className={s.stat}>
              <strong>{completed.length}</strong>
              <span>Проведено тренувань</span>
            </div>
            <div className={s.stat}>
              <strong>{rate}%</strong>
              <span>Середня відвідуваність</span>
            </div>
            <div className={s.stat}>
              <strong>{marked.length - present}</strong>
              <span>Пропусків</span>
            </div>
          </div>
          <section className={s.section}>
            <div className={s.sectionTitle}>
              <h2>Потребують уваги</h2>
            </div>
            <div className={s.memberList}>
              {g.memberships
                .filter(
                  (m) =>
                    m.athlete.attendance.slice(0, 3).filter((a) => a.status === "ABSENT").length >=
                    2,
                )
                .map((m) => (
                  <Link className={s.member} href={`/athletes/${m.athlete.id}`} key={m.id}>
                    <span className={s.initial}>{m.athlete.firstName[0]}</span>
                    <div>
                      <strong>
                        {m.athlete.firstName} {m.athlete.lastName}
                      </strong>
                      <small>Пропущено щонайменше 2 з останніх 3 тренувань</small>
                    </div>
                  </Link>
                ))}
              {!g.memberships.some(
                (m) =>
                  m.athlete.attendance.slice(0, 3).filter((a) => a.status === "ABSENT").length >= 2,
              ) && <div className={s.empty}>Наразі ніхто не потребує уваги.</div>}
            </div>
          </section>
        </>
      )}
      {tab === "members" && (
        <MemberManager
          groupId={g.id}
          candidates={athletes.map((a) => ({
            id: a.id,
            firstName: a.firstName,
            lastName: a.lastName,
            parentPhone: a.parentPhone,
            isActive: a.isActive && a.memberships.length > 0,
            alreadyMember: a.memberships.some((m) => m.group.id === g.id),
          }))}
          members={g.memberships
            .filter((m) => m.isActive && m.athlete.isActive)
            .map((m) => ({
              id: m.athlete.id,
              firstName: m.athlete.firstName,
              lastName: m.athlete.lastName,
              birthDate: m.athlete.birthDate?.toISOString() ?? null,
              parentName: m.athlete.parentName,
              parentPhone: m.athlete.parentPhone,
            }))}
        />
      )}
      {tab === "trainings" && (
        <>
          <HistoryFilters id={id} tab="trainings" query={g.query} locations={locations} />
          <div className={s.calendarList}>
            {g.trainings.map((t, index) => {
              const attendance = attendanceSummary(
                t.attendance,
                g.memberships.filter((m) => m.isActive && m.athlete.isActive).length,
              );
              const month = new Intl.DateTimeFormat("uk-UA", {
                month: "long",
                year: "numeric",
                timeZone: "Europe/Kyiv",
              }).format(t.startsAt);
              const previous = index
                ? new Intl.DateTimeFormat("uk-UA", {
                    month: "long",
                    year: "numeric",
                    timeZone: "Europe/Kyiv",
                  }).format(g.trainings[index - 1].startsAt)
                : null;
              return (
                <div key={t.id}>
                  {month !== previous && <h2 className={s.stickyMonth}>{month}</h2>}
                  <Link className={s.member} href={`/trainings/${t.id}`}>
                    <div>
                      <strong>
                        {date(t.startsAt)} ·{" "}
                        {new Intl.DateTimeFormat("uk-UA", {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "Europe/Kyiv",
                        }).format(t.startsAt)}
                      </strong>
                      <small>
                        {t.location ?? "Без локації"} ·{" "}
                        {t.status === "CANCELLED"
                          ? "Скасовано"
                          : t.startsAt < new Date()
                            ? "Проведено"
                            : "Заплановано"}
                      </small>
                    </div>
                    <span className={s.right}>
                      Присутні: {attendance.present}/{attendance.total}
                    </span>
                  </Link>
                </div>
              );
            })}
            {!g.trainings.length && (
              <div className={s.empty}>
                <strong>За цей період тренувань немає</strong>Оберіть інший період.
              </div>
            )}
          </div>
          <Pagination id={id} tab="trainings" query={g.query} hasMore={g.hasMore} />
        </>
      )}
      {tab === "attendance" && (
        <>
          <HistoryFilters id={id} tab="attendance" query={g.query} locations={locations} />
          <div className={s.legend}>
            <span>
              <i className={s.present}>✓</i> Присутній
            </span>
            <span>
              <i className={s.absent}>×</i> Відсутній
            </span>
            <span>
              <i className={s.unmarked}>·</i> Не відмічено
            </span>
          </div>
          <div className={s.matrix}>
            <table>
              <thead>
                <tr>
                  <th>Спортсмен</th>
                  {g.trainings.slice(0, 8).map((t) => (
                    <th key={t.id}>
                      <Link
                        href={`/trainings/${t.id}`}
                        aria-label={`Відкрити тренування ${date(t.startsAt)}`}
                      >
                        {date(t.startsAt)}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {g.memberships.map((m) => (
                  <tr key={m.id}>
                    <td>
                      {m.athlete.firstName} {m.athlete.lastName}
                    </td>
                    {g.trainings.slice(0, 8).map((t) => {
                      const st =
                        t.attendance.find((a) => a.athleteId === m.athleteId)?.status ?? "UNMARKED";
                      return (
                        <td key={t.id}>
                          <span
                            title={`${m.athlete.firstName}: ${st} — ${date(t.startsAt)}`}
                            aria-label={`${m.athlete.firstName}: ${st} — ${date(t.startsAt)}`}
                            className={`${s.dot} ${st === "PRESENT" ? s.present : st === "ABSENT" ? s.absent : s.unmarked}`}
                          >
                            {st === "PRESENT" ? "✓" : st === "ABSENT" ? "×" : "·"}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={s.mobileAttendance}>
            {g.trainings.map((t) => {
              const present = t.attendance.filter((a) => a.status === "PRESENT").length;
              const absent = t.attendance.filter((a) => a.status === "ABSENT").length;
              return (
                <Link className={s.member} href={`/trainings/${t.id}`} key={t.id}>
                  <div>
                    <strong>
                      {date(t.startsAt)} ·{" "}
                      {new Intl.DateTimeFormat("uk-UA", {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Europe/Kyiv",
                      }).format(t.startsAt)}
                    </strong>
                    <small>
                      {present} із {g.memberships.length} присутні · {absent} відсутні
                    </small>
                  </div>
                  <span className={s.right}>→</span>
                </Link>
              );
            })}
          </div>
          <Pagination id={id} tab="attendance" query={g.query} hasMore={g.hasMore} />
        </>
      )}
    </div>
  );
}
function HistoryFilters({
  id,
  tab,
  query,
  locations,
}: {
  id: string;
  tab: string;
  query: { period: string; page: number; location: string };
  locations: { id: string; name: string }[];
}) {
  return (
    <form className={s.filters}>
      <input type="hidden" name="tab" value={tab} />
      <select name="period" defaultValue={query.period} aria-label="Період">
        <option value="this-month">Цей місяць</option>
        <option value="last-month">Минулий місяць</option>
        <option value="three-months">Останні 3 місяці</option>
        <option value="year">Рік</option>
      </select>
      <select name="location" defaultValue={query.location} aria-label="Фільтр за локацією">
        <option value="">Усі локації</option>
        {locations.map((location) => (
          <option key={location.id} value={location.id}>
            {location.name}
          </option>
        ))}
      </select>
      <button className={s.buttonGhost}>Застосувати</button>
      <Link className={s.topLink} href={`/groups/${id}?tab=${tab}`}>
        Очистити
      </Link>
    </form>
  );
}
function Pagination({
  id,
  tab,
  query,
  hasMore,
}: {
  id: string;
  tab: string;
  query: { period: string; page: number; location: string };
  hasMore: boolean;
}) {
  const base = `/groups/${id}?tab=${tab}&period=${query.period}&location=${encodeURIComponent(query.location)}`;
  return (
    <nav className={s.pagination} aria-label="Сторінки історії">
      {query.page > 1 && (
        <Link className={s.buttonGhost} href={`${base}&page=${query.page - 1}`}>
          ← Новіші
        </Link>
      )}
      <span>Сторінка {query.page}</span>
      {hasMore && (
        <Link className={s.buttonGhost} href={`${base}&page=${query.page + 1}`}>
          Старіші →
        </Link>
      )}
    </nav>
  );
}
