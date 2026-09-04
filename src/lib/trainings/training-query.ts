import { z } from "zod";
export const PERIODS = ["this-month", "last-month", "three-months", "year"] as const;
export const PAGE_SIZE = 12;
export const MATRIX_PAGE_SIZE = 8;
const inputSchema = z.object({
  period: z.enum(PERIODS).catch("this-month"),
  page: z.coerce.number().int().min(1).max(500).catch(1),
  location: z.string().trim().max(80).catch(""),
});

export function parseTrainingQuery(input: Record<string, string | undefined>, now = new Date()) {
  const parsed = inputSchema.parse(input);
  const start = new Date(now);
  const end = new Date(now);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  if (parsed.period === "this-month") {
    start.setDate(1);
    end.setMonth(end.getMonth() + 1, 0);
  }
  if (parsed.period === "last-month") {
    start.setMonth(start.getMonth() - 1, 1);
    end.setDate(0);
  }
  if (parsed.period === "three-months") start.setMonth(start.getMonth() - 2, 1);
  if (parsed.period === "year") start.setMonth(start.getMonth() - 11, 1);
  if (start > end) {
    const startTime = start.getTime();
    start.setTime(end.getTime());
    end.setTime(startTime);
  }
  return { ...parsed, start, end, take: PAGE_SIZE, skip: (parsed.page - 1) * PAGE_SIZE };
}
