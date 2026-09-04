export type TrainingWindowInput = {
  startsAt: Date;
  endsAt: Date | null;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
};
export type TrainingWindowState = "CANCELLED" | "UPCOMING" | "READY" | "LIVE" | "FINISHED";
const MINUTE = 60_000;

export function getTrainingWindow(
  training: TrainingWindowInput,
  now = new Date(),
): TrainingWindowState {
  if (training.status === "CANCELLED") return "CANCELLED";
  const opensAt = training.startsAt.getTime() - 30 * MINUTE;
  const closesAt = (training.endsAt ?? training.startsAt).getTime() + 30 * MINUTE;
  if (now.getTime() < opensAt) return "UPCOMING";
  if (now.getTime() > closesAt) return "FINISHED";
  return now < training.startsAt ? "READY" : "LIVE";
}

export function canOpenTraining(training: TrainingWindowInput, now = new Date()) {
  const state = getTrainingWindow(training, now);
  return state === "READY" || state === "LIVE";
}
