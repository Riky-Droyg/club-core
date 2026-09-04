import "dotenv/config";
import { prisma } from "@/server/db/prisma";
import { syncClubAthleteStatuses } from "@/server/athletes/status";

async function main() {
  const clubs = await prisma.club.findMany({ select: { id: true, name: true } });
  for (const club of clubs) {
    const count = await syncClubAthleteStatuses(prisma, club.id);
    console.info(`${club.name}: synchronized ${count} athlete statuses`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
