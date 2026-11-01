import { turso } from "./turso";
import { normalizeTrackingCode } from "./tracking";

export type PublicTracking = {
  trackingCode: string;
  status: string;
  origin: { name: string; city: string };
  destination: { address: string; city: string };
  weightKg: number;
  promisedDate: string;
  location: { lat: number; lng: number; updatedAt: string | null } | null;
  events: { status: string; note: string | null; createdAt: string }[];
};

type Row = Record<string, unknown>;

export async function getPublicTracking(code: string): Promise<PublicTracking | null> {
  const normalized = normalizeTrackingCode(code);
  const result = await turso.execute({
    sql: `SELECT
        s.trackingCode, s.status, s.destinationAddress, s.destinationCity,
        s.weightKg, s.promisedDate, s.currentLat, s.currentLng, s.locationUpdatedAt,
        w.name AS originName, w.city AS originCity,
        (
          SELECT json_group_array(json_object(
            'status', e.status, 'note', e.note, 'createdAt', e.createdAt
          ))
          FROM (
            SELECT status, note, createdAt
            FROM ShipmentEvent
            WHERE shipmentId = s.id
            ORDER BY createdAt ASC
          ) e
        ) AS events
      FROM Shipment s
      JOIN Warehouse w ON w.id = s.originId
      WHERE s.trackingCode = ?
      LIMIT 1`,
    args: [normalized],
  });

  if (result.rows.length === 0) return null;
  const row = result.rows[0] as Row;
  const lat = row.currentLat as number | null;
  const lng = row.currentLng as number | null;

  return {
    trackingCode: row.trackingCode as string,
    status: row.status as string,
    origin: { name: row.originName as string, city: row.originCity as string },
    destination: { address: row.destinationAddress as string, city: row.destinationCity as string },
    weightKg: row.weightKg as number,
    promisedDate: row.promisedDate as string,
    location:
      lat != null && lng != null
        ? { lat, lng, updatedAt: (row.locationUpdatedAt as string | null) ?? null }
        : null,
    events: JSON.parse((row.events as string) || "[]"),
  };
}
