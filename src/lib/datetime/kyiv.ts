export const CLUB_TIME_ZONE = "Europe/Kyiv";

type DateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const partsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: CLUB_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export function getKyivParts(date: Date): DateParts {
  const values = Object.fromEntries(
    partsFormatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
  return values as DateParts;
}

function offsetAt(instant: Date) {
  const part = getKyivParts(instant);
  return (
    Date.UTC(part.year, part.month - 1, part.day, part.hour, part.minute, part.second) -
    instant.getTime()
  );
}

/** Converts a wall-clock value in Europe/Kyiv to the UTC instant stored by Prisma. */
export function kyivDateTimeToUtc(date: string, time: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match || !timeMatch) throw new Error("Некоректна дата або час");
  const [, year, month, day] = match.map(Number);
  const [, hour, minute] = timeMatch.map(Number);
  const wallClockUtc = Date.UTC(year, month - 1, day, hour, minute);
  let instant = new Date(wallClockUtc - offsetAt(new Date(wallClockUtc)));
  instant = new Date(wallClockUtc - offsetAt(instant));
  const actual = getKyivParts(instant);
  if (
    actual.year !== year ||
    actual.month !== month ||
    actual.day !== day ||
    actual.hour !== hour ||
    actual.minute !== minute
  ) {
    throw new Error("Цей локальний час не існує через перехід на літній час");
  }
  return instant;
}

export function formatKyivDateKey(date: Date) {
  const value = getKyivParts(date);
  return `${value.year}-${String(value.month).padStart(2, "0")}-${String(value.day).padStart(2, "0")}`;
}

export function formatKyivTime(date: Date) {
  return new Intl.DateTimeFormat("uk-UA", {
    timeZone: CLUB_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function kyivDayRange(date = new Date()) {
  const key = formatKyivDateKey(date);
  const start = kyivDateTimeToUtc(key, "00:00");
  const next = new Date(`${key}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return { start, end: kyivDateTimeToUtc(next.toISOString().slice(0, 10), "00:00") };
}

function dateKeyFromParts(year: number, monthIndex: number, day: number) {
  return new Date(Date.UTC(year, monthIndex, day, 12)).toISOString().slice(0, 10);
}

export function kyivPeriodRange(period: "today" | "week" | "month" | "year", now = new Date()) {
  const local = getKyivParts(now);
  let startKey = dateKeyFromParts(local.year, local.month - 1, local.day);
  let endKey: string;
  if (period === "today") endKey = dateKeyFromParts(local.year, local.month - 1, local.day + 1);
  else if (period === "week") {
    const weekday = new Date(`${startKey}T12:00:00Z`).getUTCDay();
    const mondayOffset = (weekday + 6) % 7;
    startKey = dateKeyFromParts(local.year, local.month - 1, local.day - mondayOffset);
    endKey = dateKeyFromParts(local.year, local.month - 1, local.day - mondayOffset + 7);
  } else if (period === "month") {
    startKey = dateKeyFromParts(local.year, local.month - 1, 1);
    endKey = dateKeyFromParts(local.year, local.month, 1);
  } else {
    startKey = dateKeyFromParts(local.year, local.month - 12, 1);
    endKey = dateKeyFromParts(local.year, local.month, 1);
  }
  return {
    start: kyivDateTimeToUtc(startKey, "00:00"),
    end: kyivDateTimeToUtc(endKey, "00:00"),
  };
}
