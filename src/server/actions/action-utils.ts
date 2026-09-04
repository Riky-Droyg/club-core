import { requireActionUser } from "@/server/auth/session";

export const formText = (value: FormDataEntryValue | null) => String(value ?? "").trim() || null;

export async function requireActionClubId() {
  const user = await requireActionUser();
  if (!user.clubId) throw new Error("Користувач не прив’язаний до клубу");
  return user.clubId;
}
