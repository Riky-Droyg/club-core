import type { Prisma, PrismaClient } from "@/generated/prisma/client";

type DbClient = PrismaClient | Prisma.TransactionClient;

/** Athlete.isActive is a denormalized value derived from active memberships. */
export async function syncAthleteStatus(db: DbClient, athleteId: string, clubId: string) {
  const activeMemberships = await db.groupMembership.count({
    where: { athleteId, isActive: true, group: { clubId, isActive: true } },
  });
  const isActive = activeMemberships > 0;
  await db.athlete.update({ where: { id: athleteId, clubId }, data: { isActive } });
  return isActive;
}

export async function syncClubAthleteStatuses(db: DbClient, clubId: string) {
  const athletes = await db.athlete.findMany({ where: { clubId }, select: { id: true } });
  for (const athlete of athletes) await syncAthleteStatus(db, athlete.id, clubId);
  return athletes.length;
}
