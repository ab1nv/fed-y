import type { ShipmentStatus } from "./state-machine";

export type Risk = { score: number; level: "none" | "low" | "medium" | "high"; reasons: string[] };

export function computeRisk(
  status: ShipmentStatus,
  lastEventAt: Date | null,
  promisedDate: Date,
  now = new Date(),
): Risk {
  if (status === "DELIVERED" || status === "CANCELLED")
    return { score: 0, level: "none", reasons: [] };

  let score = 0;
  const reasons: string[] = [];
  const hoursLeft = (promisedDate.getTime() - now.getTime()) / 3600_000;
  const hoursSinceUpdate = lastEventAt ? (now.getTime() - lastEventAt.getTime()) / 3600_000 : 0;

  if (hoursLeft < 0) {
    score += 3;
    reasons.push(`Past promised delivery by ${Math.max(1, Math.round(-hoursLeft))}h`);
  } else if (hoursLeft < 6) {
    score += 2;
    reasons.push(`Delivery window closes in ${Math.max(1, Math.round(hoursLeft))}h`);
  } else if (hoursLeft < 24) {
    score += 1;
    reasons.push("Due within 24h");
  }

  if (hoursSinceUpdate > 24) {
    score += 3;
    reasons.push(`No status update for ${Math.round(hoursSinceUpdate)}h`);
  } else if (hoursSinceUpdate > 16) {
    score += 2;
    reasons.push(`Stale: no update for ${Math.round(hoursSinceUpdate)}h`);
  } else if (hoursSinceUpdate > 8) {
    score += 1;
    reasons.push(`Quiet for ${Math.round(hoursSinceUpdate)}h`);
  }

  if (
    hoursLeft < 24 &&
    (status === "CREATED" || status === "ASSIGNED" || status === "PICKED_UP")
  ) {
    score += 1;
    reasons.push("Not yet in transit with <24h remaining");
  }
  if (status === "EXCEPTION") {
    score += 2;
    reasons.push("Open exception");
  }

  const level = score >= 4 ? "high" : score >= 2 ? "medium" : "low";
  return { score, level, reasons };
}
