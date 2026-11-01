import { turso } from "./turso";

export type DashboardStatusCount = { status: string; n: number };
export type DashboardDelivered = { createdAt: string; note: string | null };
export type DashboardEvent = {
  id: string;
  status: string;
  note: string | null;
  createdAt: string;
  trackingCode: string;
  shipmentId: string;
};
export type DashboardShipment = {
  id: string;
  trackingCode: string;
  status: string;
  destinationCity: string;
  promisedDate: string;
  driverName: string | null;
  lastEventAt: string | null;
};

const ACTIVE = "'ASSIGNED','PICKED_UP','IN_TRANSIT','OUT_FOR_DELIVERY','EXCEPTION'";

export async function getDashboardData(monthAgoIso: string): Promise<{
  statusCounts: DashboardStatusCount[];
  delivered: DashboardDelivered[];
  recent: DashboardEvent[];
  active: DashboardShipment[];
}> {
  const [counts, delivered, recent, active] = await turso.batch(
    [
      {
        sql: `SELECT status, COUNT(*) AS n FROM Shipment WHERE status IN (${ACTIVE}) GROUP BY status`,
      },
      {
        sql: `SELECT createdAt, note FROM ShipmentEvent
              WHERE status = 'DELIVERED' AND createdAt >= ?`,
        args: [monthAgoIso],
      },
      {
        sql: `SELECT e.id, e.status, e.note, e.createdAt,
                     s.trackingCode, s.id AS shipmentId
              FROM ShipmentEvent e
              JOIN Shipment s ON s.id = e.shipmentId
              ORDER BY e.createdAt DESC
              LIMIT 8`,
      },
      {
        sql: `SELECT s.id, s.trackingCode, s.status, s.destinationCity, s.promisedDate,
                     u.name AS driverName, le.lastAt AS lastEventAt
              FROM Shipment s
              LEFT JOIN Driver d ON d.id = s.driverId
              LEFT JOIN User u ON u.id = d.userId
              LEFT JOIN (
                SELECT shipmentId, MAX(createdAt) AS lastAt
                FROM ShipmentEvent GROUP BY shipmentId
              ) le ON le.shipmentId = s.id
              WHERE s.status IN (${ACTIVE})`,
      },
    ],
    "read",
  );

  return {
    statusCounts: counts.rows.map((r) => ({ status: r.status as string, n: Number(r.n) })),
    delivered: delivered.rows.map((r) => ({
      createdAt: r.createdAt as string,
      note: (r.note as string | null) ?? null,
    })),
    recent: recent.rows.map((r) => ({
      id: r.id as string,
      status: r.status as string,
      note: (r.note as string | null) ?? null,
      createdAt: r.createdAt as string,
      trackingCode: r.trackingCode as string,
      shipmentId: r.shipmentId as string,
    })),
    active: active.rows.map((r) => ({
      id: r.id as string,
      trackingCode: r.trackingCode as string,
      status: r.status as string,
      destinationCity: r.destinationCity as string,
      promisedDate: r.promisedDate as string,
      driverName: (r.driverName as string | null) ?? null,
      lastEventAt: (r.lastEventAt as string | null) ?? null,
    })),
  };
}
