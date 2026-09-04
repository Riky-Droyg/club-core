"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { syncAthleteStatus } from "@/server/athletes/status";
import { kyivDateTimeToUtc } from "@/lib/datetime/kyiv";
import { formText as text, requireActionClubId as clubId } from "./action-utils";

export async function saveGroup(form: FormData) {
  try {
    const cid = await clubId();
    const id = text(form.get("id"));
    const data = z
      .object({
        name: z.string().min(2).max(80),
        description: z.string().max(300).nullable(),
        ageFrom: z.number().int().min(1).max(99).nullable(),
        ageTo: z.number().int().min(1).max(99).nullable(),
        locationId: z.string().nullable(),
      })
      .parse({
        name: text(form.get("name")),
        description: text(form.get("description")),
        ageFrom: text(form.get("ageFrom")) ? Number(form.get("ageFrom")) : null,
        ageTo: text(form.get("ageTo")) ? Number(form.get("ageTo")) : null,
        locationId: text(form.get("locationId")),
      });
    if (data.locationId)
      await prisma.location.findFirstOrThrow({
        where: { id: data.locationId, clubId: cid, isActive: true },
      });
    if (id) await prisma.group.update({ where: { id, clubId: cid }, data });
    else await prisma.group.create({ data: { ...data, clubId: cid } });
    revalidatePath("/groups");
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error:
        error instanceof z.ZodError
          ? (error.issues[0]?.message ?? "Перевірте дані")
          : "Не вдалося зберегти групу",
    };
  }
}
export async function deactivateGroup(form: FormData) {
  const cid = await clubId();
  const id = z.string().parse(form.get("id"));
  const memberships = await prisma.groupMembership.findMany({
    where: { groupId: id, isActive: true, group: { clubId: cid } },
    select: { athleteId: true },
  });
  await prisma.$transaction(async (tx) => {
    await tx.group.update({ where: { id, clubId: cid }, data: { isActive: false } });
    for (const membership of memberships) await syncAthleteStatus(tx, membership.athleteId, cid);
  });
  revalidatePath("/groups");
  return { ok: true as const };
}

export async function saveAthlete(form: FormData) {
  try {
    const cid = await clubId();
    const id = text(form.get("id"));
    const groupId = text(form.get("groupId"));
    const group = groupId
      ? await prisma.group.findFirstOrThrow({ where: { id: groupId, clubId: cid } })
      : null;
    const birthDateValue = text(form.get("birthDate"));
    const data = z
      .object({
        firstName: z.string().min(2).max(60),
        lastName: z.string().min(2, "Вкажіть прізвище").max(60),
        birthDate: z.date().nullable(),
        parentName: z.string().max(100).nullable(),
        parentPhone: z
          .string()
          .min(7)
          .max(30)
          .regex(/^\+?[0-9 ()-]{7,30}$/, "Вкажіть коректний номер телефону"),
        note: z.string().max(500).nullable(),
      })
      .parse({
        firstName: text(form.get("firstName")),
        lastName: text(form.get("lastName")),
        birthDate: birthDateValue ? new Date(`${birthDateValue}T00:00:00Z`) : null,
        parentName: text(form.get("parentName")),
        parentPhone: text(form.get("parentPhone")),
        note: text(form.get("note")),
      });
    if (data.birthDate && Number.isNaN(data.birthDate.getTime()))
      throw new Error("Некоректна дата народження");
    if (id) {
      await prisma.$transaction(async (tx) => {
        await tx.athlete.update({ where: { id, clubId: cid }, data });
        if (group)
          await tx.groupMembership.upsert({
            where: { groupId_athleteId: { groupId: group.id, athleteId: id } },
            create: { groupId: group.id, athleteId: id },
            update: { isActive: true, leftAt: null },
          });
        await syncAthleteStatus(tx, id, cid);
      });
    } else
      await prisma.athlete.create({
        data: {
          ...data,
          clubId: cid,
          isActive: Boolean(group),
          ...(group ? { memberships: { create: { groupId: group.id } } } : {}),
        },
      });
    if (group) revalidatePath(`/groups/${group.id}`);
    revalidatePath("/athletes");
    revalidatePath(`/athletes/${id ?? ""}`);
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error:
        error instanceof z.ZodError
          ? (error.issues[0]?.message ?? "Перевірте дані")
          : error instanceof Error
            ? error.message
            : "Не вдалося зберегти спортсмена",
    };
  }
}
export async function deactivateAthlete(form: FormData) {
  try {
    const cid = await clubId();
    const id = z.string().parse(form.get("id"));
    await prisma.athlete.findFirstOrThrow({ where: { id, clubId: cid } });
    await prisma.$transaction(async (tx) => {
      await tx.groupMembership.updateMany({
        where: { athleteId: id, isActive: true, group: { clubId: cid } },
        data: { isActive: false, leftAt: new Date() },
      });
      await syncAthleteStatus(tx, id, cid);
    });
    revalidatePath("/groups");
    revalidatePath("/athletes");
    revalidatePath(`/athletes/${id}`);
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "Не вдалося деактивувати спортсмена" };
  }
}

export async function removeAthleteFromGroup(form: FormData) {
  try {
    const cid = await clubId();
    const athleteId = z.string().min(1).parse(form.get("athleteId"));
    const groupId = z.string().min(1).parse(form.get("groupId"));
    await prisma.group.findFirstOrThrow({ where: { id: groupId, clubId: cid } });
    await prisma.athlete.findFirstOrThrow({ where: { id: athleteId, clubId: cid } });
    await prisma.$transaction(async (tx) => {
      await tx.groupMembership.updateMany({
        where: { groupId, athleteId, isActive: true },
        data: { isActive: false, leftAt: new Date() },
      });
      await syncAthleteStatus(tx, athleteId, cid);
    });
    revalidatePath(`/groups/${groupId}`);
    revalidatePath("/athletes");
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "Не вдалося видалити спортсмена з групи" };
  }
}

export async function deleteAthlete(form: FormData) {
  try {
    const cid = await clubId();
    const id = z.string().min(1).parse(form.get("id"));
    const confirmation = z.string().parse(form.get("confirmation"));
    const athlete = await prisma.athlete.findFirstOrThrow({ where: { id, clubId: cid } });
    if (confirmation !== "ВИДАЛИТИ" && confirmation !== athlete.lastName)
      return { ok: false as const, error: "Введіть прізвище спортсмена або ВИДАЛИТИ" };
    await prisma.$transaction(async (tx) => {
      await tx.attendance.deleteMany({ where: { athleteId: id } });
      await tx.groupMembership.deleteMany({ where: { athleteId: id } });
      await tx.athlete.delete({ where: { id, clubId: cid } });
    });
    revalidatePath("/athletes");
    revalidatePath("/groups");
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "Не вдалося повністю видалити спортсмена" };
  }
}

export async function activateAthlete(form: FormData) {
  try {
    const cid = await clubId();
    const id = z.string().min(1).parse(form.get("id"));
    const groupId = z.string().min(1, "Оберіть групу для активації").parse(form.get("groupId"));
    await prisma.athlete.findFirstOrThrow({ where: { id, clubId: cid } });
    await prisma.group.findFirstOrThrow({ where: { id: groupId, clubId: cid, isActive: true } });
    await prisma.$transaction(async (tx) => {
      await tx.groupMembership.upsert({
        where: { groupId_athleteId: { groupId, athleteId: id } },
        create: { groupId, athleteId: id },
        update: { isActive: true, leftAt: null },
      });
      await syncAthleteStatus(tx, id, cid);
    });
    revalidatePath("/athletes");
    revalidatePath(`/athletes/${id}`);
    revalidatePath(`/groups/${groupId}`);
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "Не вдалося активувати спортсмена" };
  }
}

export async function addAthletesToGroup(groupId: string, athleteIds: string[]) {
  try {
    const cid = await clubId();
    const ids = [...new Set(athleteIds)];
    if (!ids.length || ids.length > 50)
      return { ok: false as const, error: "Оберіть від 1 до 50 спортсменів" };
    await prisma.group.findFirstOrThrow({ where: { id: groupId, clubId: cid, isActive: true } });
    const athletes = await prisma.athlete.findMany({
      where: { id: { in: ids }, clubId: cid },
      select: { id: true },
    });
    if (athletes.length !== ids.length)
      return { ok: false as const, error: "Один або кілька спортсменів недоступні" };
    let added = 0,
      restored = 0,
      skipped = 0;
    await prisma.$transaction(async (tx) => {
      for (const athlete of athletes) {
        const membership = await tx.groupMembership.findUnique({
          where: { groupId_athleteId: { groupId, athleteId: athlete.id } },
        });
        if (!membership) {
          await tx.groupMembership.create({ data: { groupId, athleteId: athlete.id } });
          added++;
        } else if (!membership.isActive) {
          await tx.groupMembership.update({
            where: { id: membership.id },
            data: { isActive: true, leftAt: null },
          });
          restored++;
        } else skipped++;
        await syncAthleteStatus(tx, athlete.id, cid);
      }
    });
    revalidatePath(`/groups/${groupId}`);
    revalidatePath("/athletes");
    return { ok: true as const, added, restored, skipped };
  } catch {
    return { ok: false as const, error: "Не вдалося додати спортсменів до групи" };
  }
}

const locationSchema = z.object({
  name: z.string().min(2, "Назва має містити щонайменше 2 символи").max(80),
  address: z.string().max(200, "Адреса надто довга").nullable(),
});
const normalizeLocationName = (value: FormDataEntryValue | null) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");

async function locationNameExists(cid: string, name: string, exceptId?: string) {
  return prisma.location.findFirst({
    where: {
      clubId: cid,
      name: { equals: name, mode: "insensitive" },
      ...(exceptId ? { NOT: { id: exceptId } } : {}),
    },
    select: { id: true },
  });
}

export async function createLocation(form: FormData) {
  try {
    const cid = await clubId();
    const data = locationSchema.parse({
      name: normalizeLocationName(form.get("name")),
      address: text(form.get("address")),
    });
    if (await locationNameExists(cid, data.name))
      return { ok: false as const, error: "Локація з такою назвою вже існує" };
    await prisma.location.create({ data: { ...data, clubId: cid } });
    revalidatePath("/calendar");
    revalidatePath("/groups");
    revalidatePath("/groups/locations");
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error:
        error instanceof z.ZodError
          ? (error.issues[0]?.message ?? "Перевірте дані")
          : "Локація з такою назвою вже існує",
    };
  }
}

export async function updateLocation(form: FormData) {
  try {
    const cid = await clubId();
    const id = z.string().min(1).parse(form.get("id"));
    await prisma.location.findFirstOrThrow({ where: { id, clubId: cid } });
    const data = locationSchema.parse({
      name: normalizeLocationName(form.get("name")),
      address: text(form.get("address")),
    });
    if (await locationNameExists(cid, data.name, id))
      return { ok: false as const, error: "Локація з такою назвою вже існує" };
    await prisma.location.update({ where: { id, clubId: cid }, data });
    revalidatePath("/calendar");
    revalidatePath("/groups");
    revalidatePath("/groups/locations");
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error:
        error instanceof z.ZodError
          ? (error.issues[0]?.message ?? "Перевірте дані")
          : "Не вдалося оновити локацію",
    };
  }
}

async function changeLocationStatus(form: FormData, isActive: boolean) {
  try {
    const cid = await clubId();
    const id = z.string().min(1).parse(form.get("id"));
    const location = await prisma.location.findFirstOrThrow({
      where: { id, clubId: cid },
      select: {
        _count: {
          select: {
            groups: { where: { isActive: true } },
            trainings: { where: { startsAt: { gte: new Date() }, status: "SCHEDULED" } },
          },
        },
      },
    });
    await prisma.location.update({ where: { id, clubId: cid }, data: { isActive } });
    revalidatePath("/calendar");
    revalidatePath("/groups");
    revalidatePath("/groups/locations");
    return { ok: true as const, counts: location._count };
  } catch {
    return { ok: false as const, error: "Не вдалося змінити статус локації" };
  }
}

export async function deactivateLocation(form: FormData) {
  return changeLocationStatus(form, false);
}

export async function activateLocation(form: FormData) {
  return changeLocationStatus(form, true);
}

export async function deleteLocation(form: FormData) {
  try {
    const cid = await clubId();
    const id = z.string().min(1).parse(form.get("id"));
    const location = await prisma.location.findFirst({
      where: { id, clubId: cid },
      select: { id: true, _count: { select: { groups: true, trainings: true } } },
    });
    if (!location) return { ok: false as const, error: "Локацію не знайдено" };
    if (location._count.groups > 0 || location._count.trainings > 0)
      return {
        ok: false as const,
        error:
          "Неможливо видалити локацію, оскільки вона використовується групами або тренуваннями. Спочатку змініть локацію у пов’язаних записах.",
      };
    await prisma.location.delete({ where: { id, clubId: cid } });
    revalidatePath("/groups/locations");
    revalidatePath("/groups");
    revalidatePath("/calendar");
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "Не вдалося видалити локацію" };
  }
}

export async function saveTraining(form: FormData) {
  try {
    const cid = await clubId();
    const id = text(form.get("id"));
    const groupId = z.string().parse(form.get("groupId"));
    await prisma.group.findFirstOrThrow({ where: { id: groupId, clubId: cid } });
    const date = z.string().parse(form.get("date"));
    const start = z.string().parse(form.get("startTime"));
    const end = text(form.get("endTime"));
    const locationId = text(form.get("locationId"));
    const currentTraining = id
      ? await prisma.training.findFirstOrThrow({
          where: { id, clubId: cid },
          select: { locationId: true },
        })
      : null;
    const venue = locationId
      ? await prisma.location.findFirstOrThrow({
          where: {
            id: locationId,
            clubId: cid,
            OR: [{ isActive: true }, { id: currentTraining?.locationId ?? "" }],
          },
        })
      : null;
    const startsAt = kyivDateTimeToUtc(date, start);
    const endsAt = end ? kyivDateTimeToUtc(date, end) : null;
    if (endsAt && endsAt <= startsAt) throw new Error("Час завершення має бути після початку");
    const data = {
      groupId,
      startsAt,
      endsAt,
      location: venue?.name ?? null,
      locationId,
      note: text(form.get("note")),
      title: text(form.get("title")),
    };
    if (id) await prisma.training.update({ where: { id, clubId: cid }, data });
    else await prisma.training.create({ data: { ...data, clubId: cid } });
    revalidatePath("/calendar");
    if (id) revalidatePath(`/trainings/${id}`);
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Не вдалося зберегти тренування",
    };
  }
}
export async function cancelTraining(form: FormData) {
  try {
    const cid = await clubId();
    const id = z.string().min(1).parse(form.get("id"));
    const training = await prisma.training.findFirst({
      where: { id, clubId: cid },
      select: { id: true, status: true, startsAt: true, endsAt: true, groupId: true },
    });
    if (!training) return { ok: false as const, error: "Тренування не знайдено" };
    if (training.status !== "SCHEDULED")
      return { ok: false as const, error: "Скасувати можна лише заплановане тренування" };
    const closesAt = training.endsAt ?? training.startsAt;
    if (closesAt.getTime() + 30 * 60_000 < Date.now())
      return { ok: false as const, error: "Завершене тренування не можна скасувати" };
    await prisma.training.update({
      where: { id, clubId: cid },
      data: { status: "CANCELLED" },
    });
    revalidatePath("/calendar");
    revalidatePath("/dashboard");
    revalidatePath(`/groups/${training.groupId}`);
    revalidatePath(`/trainings/${id}`);
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "Не вдалося скасувати тренування" };
  }
}

export async function restoreTraining(form: FormData) {
  try {
    const cid = await clubId();
    const id = z.string().min(1).parse(form.get("id"));
    const training = await prisma.training.findFirst({
      where: { id, clubId: cid },
      select: { id: true, status: true, groupId: true },
    });
    if (!training) return { ok: false as const, error: "Тренування не знайдено" };
    if (training.status !== "CANCELLED")
      return { ok: false as const, error: "Відновити можна лише скасоване тренування" };
    await prisma.training.update({
      where: { id, clubId: cid },
      data: { status: "SCHEDULED" },
    });
    revalidatePath("/calendar");
    revalidatePath("/dashboard");
    revalidatePath(`/groups/${training.groupId}`);
    revalidatePath(`/trainings/${id}`);
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "Не вдалося відновити тренування" };
  }
}

export async function deleteTraining(form: FormData) {
  const cid = await clubId();
  const id = z.string().parse(form.get("id"));
  await prisma.training.delete({ where: { id, clubId: cid } });
  revalidatePath("/calendar");
  redirect("/calendar");
}

export async function setAttendance(
  trainingId: string,
  athleteId: string,
  status: "UNMARKED" | "PRESENT" | "ABSENT",
) {
  const cid = await clubId();
  const training = await prisma.training.findFirst({
    where: { id: trainingId, clubId: cid },
    select: { groupId: true },
  });
  if (!training) throw new Error("Training not found");
  const member = await prisma.groupMembership.findFirst({
    where: { groupId: training.groupId, athleteId, athlete: { clubId: cid } },
  });
  if (!member) throw new Error("Athlete not in group");
  await prisma.attendance.upsert({
    where: { trainingId_athleteId: { trainingId, athleteId } },
    create: { trainingId, athleteId, status },
    update: { status },
  });
  revalidatePath(`/trainings/${trainingId}`);
  return { ok: true };
}
