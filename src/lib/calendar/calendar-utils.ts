export interface CalendarCell {
  date: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function createCalendarGrid(month: Date, today = new Date()): CalendarCell[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const mondayOffset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      date: toDateKey(date),
      dayNumber: date.getDate(),
      isCurrentMonth:
        date.getMonth() === month.getMonth() && date.getFullYear() === month.getFullYear(),
      isToday: toDateKey(date) === toDateKey(today),
    };
  });
}

export function formatSelectedDate(date: string) {
  return new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(
    new Date(`${date}T12:00:00`),
  );
}

export function formatDuration(startTime: string, endTime: string) {
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  const minutes = endHour * 60 + endMinute - startHour * 60 - startMinute;
  if (minutes <= 0) return "";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} hr ${remainder} min` : `${hours} hr`;
}
