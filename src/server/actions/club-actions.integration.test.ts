import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/server/db/prisma";

const auth = vi.hoisted(() => ({ clubId: "" }));
vi.mock("@/server/auth/session", () => ({
  requireActionUser: vi.fn(async () => ({ id: "integration-user", clubId: auth.clubId })),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import {
  activateLocation,
  addAthletesToGroup,
  cancelTraining,
  createLocation,
  deactivateAthlete,
  deactivateLocation,
  deleteAthlete,
  removeAthleteFromGroup,
  restoreTraining,
  saveAthlete,
  saveTraining,
} from "./club-actions";

const suffix = randomUUID();
const clubId = `actions-club-${suffix}`;
const otherClubId = `actions-other-${suffix}`;
const groupId = `actions-group-${suffix}`;
const secondGroupId = `actions-group-b-${suffix}`;

function athleteForm(values: Record<string, string> = {}) {
  const form = new FormData();
  form.set("firstName", values.firstName ?? "Ірина");
  form.set("lastName", values.lastName ?? "Тестова");
  form.set("parentPhone", values.parentPhone ?? "+380671234567");
  for (const [key, value] of Object.entries(values)) form.set(key, value);
  return form;
}

describe.sequential("critical club server actions", () => {
  beforeAll(async () => {
    auth.clubId = clubId;
    await prisma.club.createMany({
      data: [
        { id: clubId, name: "Actions integration club" },
        { id: otherClubId, name: "Other integration club" },
      ],
    });
    await prisma.group.createMany({
      data: [
        { id: groupId, clubId, name: "Primary group" },
        { id: secondGroupId, clubId, name: "Second group" },
      ],
    });
  });

  afterAll(async () => {
    await prisma.club.deleteMany({ where: { id: { in: [clubId, otherClubId] } } });
    await prisma.$disconnect();
  });

  it("validates athlete fields and creates an inactive athlete without a group", async () => {
    const invalid = athleteForm({ lastName: "", parentPhone: "abc" });
    expect((await saveAthlete(invalid)).ok).toBe(false);

    const result = await saveAthlete(athleteForm());
    expect(result.ok).toBe(true);
    const athlete = await prisma.athlete.findFirstOrThrow({
      where: { clubId, lastName: "Тестова" },
    });
    expect(athlete.isActive).toBe(false);
  });

  it("activates on group assignment and deactivates only after leaving the last group", async () => {
    const athlete = await prisma.athlete.findFirstOrThrow({
      where: { clubId, lastName: "Тестова" },
    });
    expect((await addAthletesToGroup(groupId, [athlete.id])).ok).toBe(true);
    expect((await addAthletesToGroup(secondGroupId, [athlete.id])).ok).toBe(true);
    expect((await prisma.athlete.findUniqueOrThrow({ where: { id: athlete.id } })).isActive).toBe(
      true,
    );

    const firstRemoval = new FormData();
    firstRemoval.set("athleteId", athlete.id);
    firstRemoval.set("groupId", groupId);
    expect((await removeAthleteFromGroup(firstRemoval)).ok).toBe(true);
    expect((await prisma.athlete.findUniqueOrThrow({ where: { id: athlete.id } })).isActive).toBe(
      true,
    );

    const secondRemoval = new FormData();
    secondRemoval.set("athleteId", athlete.id);
    secondRemoval.set("groupId", secondGroupId);
    expect((await removeAthleteFromGroup(secondRemoval)).ok).toBe(true);
    expect((await prisma.athlete.findUniqueOrThrow({ where: { id: athlete.id } })).isActive).toBe(
      false,
    );
  });

  it("manual deactivation closes every active membership without deleting history", async () => {
    const athlete = await prisma.athlete.findFirstOrThrow({
      where: { clubId, lastName: "Тестова" },
    });
    await addAthletesToGroup(groupId, [athlete.id]);
    const form = new FormData();
    form.set("id", athlete.id);
    expect((await deactivateAthlete(form)).ok).toBe(true);
    expect(
      await prisma.groupMembership.count({ where: { athleteId: athlete.id, isActive: true } }),
    ).toBe(0);
    expect(
      await prisma.groupMembership.count({ where: { athleteId: athlete.id } }),
    ).toBeGreaterThan(0);
  });

  it("requires a hard-delete verification token", async () => {
    const athlete = await prisma.athlete.findFirstOrThrow({
      where: { clubId, lastName: "Тестова" },
    });
    const rejected = new FormData();
    rejected.set("id", athlete.id);
    rejected.set("confirmation", "ні");
    expect((await deleteAthlete(rejected)).ok).toBe(false);
    expect(await prisma.athlete.findUnique({ where: { id: athlete.id } })).not.toBeNull();

    const accepted = new FormData();
    accepted.set("id", athlete.id);
    accepted.set("confirmation", "ВИДАЛИТИ");
    expect((await deleteAthlete(accepted)).ok).toBe(true);
    expect(await prisma.athlete.findUnique({ where: { id: athlete.id } })).toBeNull();
  });

  it("creates and changes location status", async () => {
    const create = new FormData();
    create.set("name", "Integration Hall");
    expect((await createLocation(create)).ok).toBe(true);
    const location = await prisma.location.findFirstOrThrow({
      where: { clubId, name: "Integration Hall" },
    });
    const form = new FormData();
    form.set("id", location.id);
    expect((await deactivateLocation(form)).ok).toBe(true);
    expect((await prisma.location.findUniqueOrThrow({ where: { id: location.id } })).isActive).toBe(
      false,
    );
    expect((await activateLocation(form)).ok).toBe(true);
    expect((await prisma.location.findUniqueOrThrow({ where: { id: location.id } })).isActive).toBe(
      true,
    );
  });

  it("stores Kyiv wall-clock training time as UTC and changes status safely", async () => {
    const form = new FormData();
    form.set("groupId", groupId);
    form.set("date", "2030-01-15");
    form.set("startTime", "18:00");
    form.set("endTime", "19:00");
    expect((await saveTraining(form)).ok).toBe(true);
    const training = await prisma.training.findFirstOrThrow({ where: { clubId, groupId } });
    expect(training.startsAt.toISOString()).toBe("2030-01-15T16:00:00.000Z");

    const statusForm = new FormData();
    statusForm.set("id", training.id);
    expect((await cancelTraining(statusForm)).ok).toBe(true);
    expect((await prisma.training.findUniqueOrThrow({ where: { id: training.id } })).status).toBe(
      "CANCELLED",
    );
    expect((await restoreTraining(statusForm)).ok).toBe(true);
    expect((await prisma.training.findUniqueOrThrow({ where: { id: training.id } })).status).toBe(
      "SCHEDULED",
    );
  });

  it("rejects access to an athlete from another club", async () => {
    const outsider = await prisma.athlete.create({
      data: { clubId: otherClubId, firstName: "Other", lastName: "Club", isActive: false },
    });
    const form = new FormData();
    form.set("id", outsider.id);
    expect((await deactivateAthlete(form)).ok).toBe(false);
    expect(await prisma.athlete.findUnique({ where: { id: outsider.id } })).not.toBeNull();
  });
});
