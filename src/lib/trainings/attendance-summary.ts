export function attendanceSummary(attendance: { status: string }[], currentActiveMembers: number) {
  return {
    present: attendance.filter((entry) => entry.status === "PRESENT").length,
    total: attendance.length || currentActiveMembers,
  };
}
