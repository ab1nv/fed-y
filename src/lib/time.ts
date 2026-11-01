export const TIME_ZONE = "Asia/Kolkata";
export const IST_OFFSET_MS = 330 * 60_000;

/** Midnight in India, expressed as the matching UTC instant. */
export function startOfIndiaDay(date: Date): Date {
  const shifted = new Date(date.getTime() + IST_OFFSET_MS);
  return new Date(
    Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) - IST_OFFSET_MS,
  );
}

/**
 * `<input type="datetime-local">` sends a wall-clock string with no zone.
 * FedY operates in India, so interpret those values as IST regardless of the
 * timezone the server happens to run in (Vercel is UTC).
 */
export function parseIndiaDateTime(value: string): Date {
  const trimmed = value.trim();
  const hasZone = /(Z|[+-]\d{2}:?\d{2})$/.test(trimmed);
  return new Date(hasZone ? trimmed : `${trimmed}+05:30`);
}

export function indiaDateTimeInput(date: Date): string {
  return date
    .toLocaleString("sv-SE", { timeZone: TIME_ZONE, hour12: false })
    .replace(" ", "T")
    .slice(0, 16);
}
