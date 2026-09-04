import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/prisma";
import { syncAthleteStatus } from "./status";

const suffix = randomUUID();
const clubId = `test-club-${suffix}`;
const athleteId = `test-athlete-${suffix}`;
const firstGroupId = `test-group-a-${suffix}`;
const secondGroupId = `test-group-b-${suffix}`;

describe("athlete status invariant", () => {
  beforeAll(async () => {
    await prisma.club.create({ data: { id: clubId, name: "Integration club" } });
    await prisma.group.createMany({
      data: [
        { id: firstGroupId, clubId, name: "First group" },
        { id: secondGroupId, clubId, name: "Second group" },
      ],
    });
    await prisma.athlete.create({
      data: { id: athleteId, clubId, firstName: "Test", lastName: "Athlete", isActive: true },
    });
  });

  afterAll(async () => {
    await prisma.club.deleteMany({ where: { id: clubId } });
    await prisma.$disconnect();
  });

  it("deactivates an athlete without an active group", async () => {
    expect(await syncAthleteStatus(prisma, athleteId, clubId)).toBe(false);
    expect(await prisma.athlete.findUniqueOrThrow({ where: { id: athleteId } })).toMatchObject({
      isActive: false,
    });
  });

  it("activates an athlete after the first membership", async () => {
    await prisma.groupMembership.create({ data: { groupId: firstGroupId, athleteId } });
    expect(await syncAthleteStatus(prisma, athleteId, clubId)).toBe(true);
  });

  it("stays active while at least one membership remains", async () => {
    await prisma.groupMembership.create({ data: { groupId: secondGroupId, athleteId } });
    await prisma.groupMembership.update({
      where: { groupId_athleteId: { groupId: firstGroupId, athleteId } },
      data: { isActive: false, leftAt: new Date() },
    });
    expect(await syncAthleteStatus(prisma, athleteId, clubId)).toBe(true);
  });

  it("deactivates after leaving the last active group", async () => {
    await prisma.groupMembership.update({
      where: { groupId_athleteId: { groupId: secondGroupId, athleteId } },
      data: { isActive: false, leftAt: new Date() },
    });
    expect(await syncAthleteStatus(prisma, athleteId, clubId)).toBe(false);
  });

  it("does not count a membership in an inactive group", async () => {
    await prisma.group.update({ where: { id: firstGroupId }, data: { isActive: false } });
    await prisma.groupMembership.update({
      where: { groupId_athleteId: { groupId: firstGroupId, athleteId } },
      data: { isActive: true, leftAt: null },
    });
    expect(await syncAthleteStatus(prisma, athleteId, clubId)).toBe(false);
  });
});
