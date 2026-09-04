import "server-only";
import { notFound } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import { requireUser } from "@/server/auth/session";
import { parseTrainingQuery } from "@/lib/trainings/training-query";
import { kyivDayRange, kyivPeriodRange } from "@/lib/datetime/kyiv";

export async function requireClub() {
  const user = await requireUser();
  if (!user.clubId) throw new Error("Користувач не прив’язаний до клубу. Запустіть seed.");
  return { user, clubId: user.clubId };
}

export async function getDashboardData() {
  const { clubId } = await requireClub();
  const now = new Date();
  const { start: dayStart, end: dayEnd } = kyivDayRange(now);
  const [club, groups, today] = await Promise.all([
    prisma.club.findUniqueOrThrow({ where: { id: clubId } }),
    prisma.group.findMany({
      where: { clubId, isActive: true },
      include: {
        _count: {
          select: { memberships: { where: { isActive: true, athlete: { isActive: true } } } },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.training.findMany({
      where: { clubId, startsAt: { gte: dayStart, lt: dayEnd } },
      include: {
        group: {
          include: {
            _count: {
              select: { memberships: { where: { isActive: true, athlete: { isActive: true } } } },
            },
          },
        },
      },
      orderBy: { startsAt: "asc" },
    }),
  ]);
  return { club, groups, today };
}

export async function getGroups(locationId?: string) {
  const { clubId } = await requireClub();
  return prisma.group.findMany({
    where: { clubId, ...(locationId ? { locationId } : {}) },
    include: {
      location: true,
      _count: {
        select: { memberships: { where: { isActive: true, athlete: { isActive: true } } } },
      },
      trainings: {
        where: { startsAt: { gte: new Date() }, status: "SCHEDULED" },
        orderBy: { startsAt: "asc" },
        take: 1,
        include: { venue: true },
      },
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });
}

export async function getGroup(id: string, queryInput: Record<string, string | undefined> = {}) {
  const { clubId } = await requireClub();
  const query = parseTrainingQuery(queryInput);
  const group = await prisma.group.findFirst({
    where: { id, clubId },
    include: {
      location: true,
      memberships: {
        where: {
          OR: [
            { isActive: true, athlete: { isActive: true } },
            {
              athlete: {
                attendance: {
                  some: {
                    training: { groupId: id, startsAt: { gte: query.start, lte: query.end } },
                  },
                },
              },
            },
          ],
        },
        include: {
          athlete: {
            include: {
              attendance: {
                where: { training: { groupId: id } },
                include: { training: true },
                orderBy: { training: { startsAt: "desc" } },
                take: 8,
              },
            },
          },
        },
        orderBy: { athlete: { firstName: "asc" } },
      },
      trainings: {
        where: {
          startsAt: { gte: query.start, lte: query.end },
          ...(query.location ? { locationId: query.location } : {}),
        },
        orderBy: { startsAt: "desc" },
        select: {
          id: true,
          startsAt: true,
          endsAt: true,
          location: true,
          locationId: true,
          venue: { select: { id: true, name: true } },
          status: true,
          attendance: { select: { athleteId: true, status: true } },
        },
        skip: query.skip,
        take: query.take + 1,
      },
    },
  });
  if (!group) notFound();
  const hasMore = group.trainings.length > query.take;
  return { ...group, trainings: group.trainings.slice(0, query.take), query, hasMore };
}

export async function getAthlete(id: string) {
  const { clubId } = await requireClub();
  const athlete = await prisma.athlete.findFirst({
    where: { id, clubId },
    include: {
      memberships: {
        where: { isActive: true, group: { isActive: true } },
        include: { group: true },
      },
      attendance: {
        include: { training: { include: { group: true } } },
        orderBy: { training: { startsAt: "desc" } },
        take: 20,
      },
    },
  });
  if (!athlete) notFound();
  return athlete;
}

export async function getTrainings(input: Record<string, string | undefined> = {}) {
  const { clubId } = await requireClub();
  const period = ["today", "week", "month", "year"].includes(input.period ?? "")
    ? input.period!
    : "month";
  const status = ["all", "scheduled", "cancelled", "completed"].includes(input.status ?? "")
    ? input.status!
    : "scheduled";
  const page = Math.max(1, Math.min(500, Number(input.page) || 1));
  const now = new Date();
  const { start, end } = kyivPeriodRange(period as "today" | "week" | "month" | "year", now);
  const statusWhere =
    status === "cancelled"
      ? { status: "CANCELLED" as const }
      : status === "scheduled"
        ? { status: "SCHEDULED" as const, startsAt: { gte: now, lt: end } }
        : status === "completed"
          ? {
              OR: [
                { status: "COMPLETED" as const },
                { status: "SCHEDULED" as const, startsAt: { lt: now } },
              ],
            }
          : {};
  const where = {
    clubId,
    startsAt: { gte: start, lt: end },
    ...(input.group ? { groupId: input.group } : {}),
    ...(input.location ? { locationId: input.location } : {}),
    ...statusWhere,
  };
  const take = 40;
  return Promise.all([
    prisma.training.findMany({
      where,
      include: { group: true, attendance: true, venue: true },
      orderBy: { startsAt: "asc" },
      skip: (page - 1) * take,
      take: take + 1,
    }),
    prisma.group.findMany({ where: { clubId, isActive: true }, orderBy: { name: "asc" } }),
    prisma.location.findMany({ where: { clubId, isActive: true }, orderBy: { name: "asc" } }),
  ]).then(([trainings, groups, locations]) => ({
    trainings: trainings.slice(0, take),
    groups,
    locations,
    hasMore: trainings.length > take,
    query: { period, status, group: input.group ?? "", location: input.location ?? "", page },
  }));
}

export async function getAthletes(input: Record<string, string | undefined> = {}) {
  const { clubId } = await requireClub();
  const status = ["all", "active", "inactive"].includes(input.status ?? "") ? input.status! : "all";
  const q = (input.q ?? "").trim().slice(0, 80);
  return prisma.athlete.findMany({
    where: {
      clubId,
      ...(status === "active"
        ? { isActive: true, memberships: { some: { isActive: true, group: { isActive: true } } } }
        : status === "inactive"
          ? {
              OR: [
                { isActive: false },
                { memberships: { none: { isActive: true, group: { isActive: true } } } },
              ],
            }
          : {}),
      ...(input.group ? { memberships: { some: { groupId: input.group, isActive: true } } } : {}),
      ...(q
        ? {
            AND: [
              {
                OR: [
                  { firstName: { contains: q, mode: "insensitive" } },
                  { lastName: { contains: q, mode: "insensitive" } },
                  { parentPhone: { contains: q } },
                ],
              },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      birthDate: true,
      parentName: true,
      parentPhone: true,
      isActive: true,
      memberships: {
        where: { isActive: true, group: { isActive: true } },
        select: { group: { select: { id: true, name: true } } },
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 100,
  });
}

export async function getLocations() {
  const { clubId } = await requireClub();
  return prisma.location.findMany({ where: { clubId, isActive: true }, orderBy: { name: "asc" } });
}

export async function getLocationManagementData() {
  const { clubId } = await requireClub();
  const now = new Date();
  return prisma.location.findMany({
    where: { clubId },
    select: {
      id: true,
      name: true,
      address: true,
      isActive: true,
      _count: {
        select: {
          groups: { where: { isActive: true } },
          trainings: { where: { startsAt: { gte: now }, status: "SCHEDULED" } },
        },
      },
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });
}

export async function getTraining(id: string) {
  const { clubId } = await requireClub();
  const training = await prisma.training.findFirst({
    where: { id, clubId },
    include: {
      group: {
        include: {
          memberships: {
            where: { isActive: true, athlete: { isActive: true } },
            include: { athlete: true },
          },
        },
      },
      attendance: true,
      venue: true,
    },
  });
  if (!training) notFound();
  training.group.memberships.sort((a, b) =>
    `${a.athlete.firstName} ${a.athlete.lastName ?? ""}`.localeCompare(
      `${b.athlete.firstName} ${b.athlete.lastName ?? ""}`,
      "uk",
    ),
  );
  return training;
}
