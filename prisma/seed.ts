import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import { AttendanceStatus, PrismaClient, TrainingStatus } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required.");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const clubId = "club_black_fox";
  await prisma.club.upsert({
    where: { id: clubId },
    create: { id: clubId, name: "Black Fox" },
    update: { name: "Black Fox" },
  });
  const user = await prisma.user.upsert({
    where: { email: "coach@clubcore.local" },
    create: {
      id: "demo_coach",
      name: "Олександр Коваль",
      email: "coach@clubcore.local",
      emailVerified: true,
      clubId,
    },
    update: { clubId, name: "Олександр Коваль" },
  });
  await prisma.account.upsert({
    where: { providerId_accountId: { providerId: "credential", accountId: user.id } },
    create: {
      id: "demo_account",
      userId: user.id,
      accountId: user.id,
      providerId: "credential",
      password: await hashPassword("ClubCoreDemo123!"),
    },
    update: { password: await hashPassword("ClubCoreDemo123!") },
  });
  const groups = [
    { id: "group_4plus", name: "4+", description: "Перші кроки у спорті", ageFrom: 4, ageTo: 7 },
    {
      id: "group_minis",
      name: "Black Fox Minis",
      description: "Молодша змагальна група",
      ageFrom: 7,
      ageTo: 10,
    },
    {
      id: "group_juniors",
      name: "Black Fox Juniors",
      description: "Юніорська змагальна група",
      ageFrom: 10,
      ageTo: 15,
    },
  ];
  const locations = [
    { id: "location_main", name: "Головна зала", address: "Центральний спортивний комплекс" },
    { id: "location_two", name: "Спортзал №2", address: "Мала тренувальна зала" },
  ];
  for (const location of locations)
    await prisma.location.upsert({
      where: { id: location.id },
      create: { ...location, clubId },
      update: location,
    });
  const first = [
    "Олена",
    "Марія",
    "Софія",
    "Анна",
    "Дарина",
    "Поліна",
    "Мілана",
    "Злата",
    "Вероніка",
    "Аліса",
    "Катерина",
    "Єва",
  ];
  const last = [
    "Коваль",
    "Бондар",
    "Мельник",
    "Ткаченко",
    "Шевченко",
    "Кравченко",
    "Олійник",
    "Лисенко",
    "Романенко",
    "Савчук",
    "Бойко",
    "Мороз",
  ];
  const localDate = (offset: number, hour: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    d.setHours(hour, 0, 0, 0);
    return d;
  };
  for (const [gi, group] of groups.entries()) {
    const locationId = gi === 2 ? "location_two" : "location_main";
    await prisma.group.upsert({
      where: { id: group.id },
      create: { ...group, clubId, locationId },
      update: { ...group, isActive: true, locationId },
    });
    for (let i = 0; i < 12; i++) {
      const id = `athlete_${gi}_${i}`;
      const data = {
        clubId,
        firstName: first[(i + gi * 3) % 12],
        lastName: last[(i * 2 + gi) % 12],
        birthDate: new Date(Date.UTC(2012 + gi - (i % 3), (i * 2) % 12, 4 + i)),
        parentName: `${["Ірина", "Наталія", "Оксана", "Юлія"][i % 4]} ${last[(i * 2 + gi) % 12]}`,
        parentPhone: `+380 67 55${gi}${String(1000 + i).slice(-4)}`,
        note: i === 3 ? "Звернути увагу на коліно після розминки" : null,
      };
      await prisma.athlete.upsert({
        where: { id },
        create: { id, ...data },
        update: { ...data, isActive: true },
      });
      await prisma.groupMembership.upsert({
        where: { groupId_athleteId: { groupId: group.id, athleteId: id } },
        create: { groupId: group.id, athleteId: id },
        update: { isActive: true, leftAt: null },
      });
    }
    for (const offset of [-21, -14, -7, 0, 3, 7]) {
      const id = `training_${gi}_${offset}`;
      const status = offset < 0 ? TrainingStatus.COMPLETED : TrainingStatus.SCHEDULED;
      await prisma.training.upsert({
        where: { id },
        create: {
          id,
          clubId,
          groupId: group.id,
          startsAt: localDate(offset, 17 + gi),
          endsAt: localDate(offset, 18 + gi),
          location: gi === 2 ? "Спортзал №2" : "Головна зала",
          locationId,
          status,
        },
        update: {
          startsAt: localDate(offset, 17 + gi),
          endsAt: localDate(offset, 18 + gi),
          locationId,
          status,
        },
      });
      if (offset < 0)
        for (let i = 0; i < 12; i++) {
          const athleteId = `athlete_${gi}_${i}`;
          const attendanceStatus =
            (i + Math.abs(offset) / 7) % 6 === 0
              ? AttendanceStatus.ABSENT
              : AttendanceStatus.PRESENT;
          await prisma.attendance.upsert({
            where: { trainingId_athleteId: { trainingId: id, athleteId } },
            create: { trainingId: id, athleteId, status: attendanceStatus },
            update: { status: attendanceStatus },
          });
        }
    }
  }
  const historyGroupId = "group_year_history";
  await prisma.group.upsert({
    where: { id: historyGroupId },
    create: {
      id: historyGroupId,
      clubId,
      name: "Black Fox Year History",
      description: "Тестова група з історією за 12 місяців",
      ageFrom: 9,
      ageTo: 14,
      locationId: "location_main",
    },
    update: { name: "Black Fox Year History", isActive: true, locationId: "location_main" },
  });
  for (let i = 0; i < 10; i++) {
    const athleteId = `athlete_history_${i}`;
    await prisma.athlete.upsert({
      where: { id: athleteId },
      create: {
        id: athleteId,
        clubId,
        firstName: first[i],
        lastName: last[(i + 3) % last.length],
        birthDate: new Date(Date.UTC(2012 + (i % 3), i % 12, 5 + i)),
        parentName: `Тестовий контакт ${i + 1}`,
        parentPhone: `+380 93 700 10${String(i).padStart(2, "0")}`,
        isActive: i !== 9,
      },
      update: { isActive: i !== 9 },
    });
    await prisma.groupMembership.upsert({
      where: { groupId_athleteId: { groupId: historyGroupId, athleteId } },
      create: {
        groupId: historyGroupId,
        athleteId,
        isActive: i !== 9,
        leftAt: i === 9 ? localDate(-30, 12) : null,
      },
      update: { isActive: i !== 9, leftAt: i === 9 ? localDate(-30, 12) : null },
    });
  }
  for (let week = -52; week <= 2; week++) {
    const trainingId = `training_history_${week}`;
    const status =
      week === -17 || week === -5
        ? TrainingStatus.CANCELLED
        : week <= 0
          ? TrainingStatus.COMPLETED
          : TrainingStatus.SCHEDULED;
    const locationId = week % 2 === 0 ? "location_main" : "location_two";
    await prisma.training.upsert({
      where: { id: trainingId },
      create: {
        id: trainingId,
        clubId,
        groupId: historyGroupId,
        startsAt: localDate(week * 7, 18),
        endsAt: localDate(week * 7, 19),
        locationId,
        location: locationId === "location_main" ? "Головна зала" : "Спортзал №2",
        status,
      },
      update: {
        startsAt: localDate(week * 7, 18),
        endsAt: localDate(week * 7, 19),
        locationId,
        status,
      },
    });
    if (status === TrainingStatus.COMPLETED)
      for (let i = 0; i < 10; i++) {
        const athleteId = `athlete_history_${i}`;
        const attendanceStatus =
          (i + week + 52) % 7 === 0
            ? AttendanceStatus.ABSENT
            : (i + week + 52) % 11 === 0
              ? AttendanceStatus.UNMARKED
              : AttendanceStatus.PRESENT;
        await prisma.attendance.upsert({
          where: { trainingId_athleteId: { trainingId, athleteId } },
          create: { trainingId, athleteId, status: attendanceStatus },
          update: { status: attendanceStatus },
        });
      }
  }
}
main()
  .then(() => console.info("CLUB Core seed complete: coach@clubcore.local / ClubCoreDemo123!"))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
