"use server";

import { revalidatePath } from "next/cache";
import { db } from "./db";
import { requireSession } from "./session";
import { locationPingSchema } from "./schemas";

export type PingResult =
  | { ok: true; at: string; lat: number; lng: number }
  | { ok: false; error: string };

const ACTIVE = ["ASSIGNED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "EXCEPTION"];

/**
 * Driver app calls this from the browser's geolocation watch. One ping moves
 * the driver profile and every open parcel on their vehicle, so dispatch and
 * the public tracking page read the same location from the database.
 */
export async function pingLocationAction(
  lat: number,
  lng: number,
  accuracy?: number,
): Promise<PingResult> {
  const session = await requireSession(["DRIVER"]);
  const parsed = locationPingSchema.safeParse({ lat, lng, accuracy });
  if (!parsed.success) return { ok: false, error: "Invalid coordinates." };

  const driver = await db.driver.findUnique({ where: { userId: session.sub } });
  if (!driver) return { ok: false, error: "No driver profile linked to this account." };

  const now = new Date();
  // ponytail: 3s + 10m dedupe stops GPS jitter flooding SQLite writes. Raise
  // the distance if parcels need finer breadcrumbs than "on this block".
  const recently = driver.lastSeenAt && now.getTime() - driver.lastSeenAt.getTime() < 3_000;
  const close =
    driver.lastLat != null &&
    driver.lastLng != null &&
    Math.abs(driver.lastLat - lat) < 0.0001 &&
    Math.abs(driver.lastLng - lng) < 0.0001;
  if (recently && close) return { ok: true, at: now.toISOString(), lat, lng };

  const data = {
    lastLat: lat,
    lastLng: lng,
    locationAccuracy: parsed.data.accuracy ?? null,
    lastSeenAt: now,
  };

  try {
    await db.$transaction([
      db.driver.update({ where: { id: driver.id }, data }),
      db.shipment.updateMany({
        where: { driverId: driver.id, status: { in: ACTIVE } },
        data: { currentLat: lat, currentLng: lng, locationUpdatedAt: now },
      }),
    ]);
  } catch {
    return { ok: false, error: "Could not save location. Try again." };
  }

  revalidatePath("/driver");
  revalidatePath("/dashboard");
  revalidatePath("/track/[code]", "page");

  return { ok: true, at: now.toISOString(), lat, lng };
}
