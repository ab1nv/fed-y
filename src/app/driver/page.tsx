import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { nextActions, type ShipmentStatus } from "@/lib/state-machine";
import { addEventAction } from "@/lib/shipment-actions";
import { startOfIndiaDay } from "@/lib/time";
import { LocationPinger } from "@/components/location-pinger";
import { Button, Card, StatusBadge, cx, fmtDateTime, fmtWeight } from "@/components/ui";

export const metadata = { title: "My stops — FedY" };

export default async function DriverPage() {
  const session = await requireSession(["DRIVER"]);
  const driver = await db.driver.findUnique({ where: { userId: session.sub } });
  if (!driver) {
    return (
      <main className="p-4 text-sm text-muted">
        No driver profile linked to this account yet. Ask an admin to re-create it.
      </main>
    );
  }

  const shipments = await db.shipment.findMany({
    where: { driverId: driver.id, status: { in: ["ASSIGNED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "EXCEPTION"] } },
    include: { customer: true, events: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { promisedDate: "asc" },
  });
  const doneToday = await db.shipment.count({
    where: {
      driverId: driver.id,
      status: "DELIVERED",
      events: { some: { status: "DELIVERED", createdAt: { gte: startOfIndiaDay(new Date()) } } },
    },
  });

  return (
    <main className="flex-1 space-y-4 p-4">
      <p className="text-sm text-muted">
        <span className="font-display text-xl font-semibold text-ink">{shipments.length}</span> open stop{shipments.length === 1 ? "" : "s"} ·{" "}
        <span className="font-medium text-emerald-600 dark:text-emerald-400">{doneToday} delivered today</span>
      </p>

      <LocationPinger lastPingAt={driver.lastSeenAt?.toISOString() ?? null} />

      {shipments.length === 0 && (
        <Card className="p-8 text-center text-sm text-muted">All clear. No open assignments right now.</Card>
      )}

      {shipments.map((s) => {
        const actions = nextActions(s.status as ShipmentStatus, true).filter(
          (a) => s.status !== "EXCEPTION" || a !== "IN_TRANSIT",
        );
        const overdue = s.promisedDate < new Date();
        return (
          <Card key={s.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-sm font-semibold text-brand">{s.trackingCode}</p>
                <p className="mt-1 text-sm font-medium">{s.customer.name}</p>
                <p className="text-xs text-muted">{s.destinationAddress}</p>
              </div>
              <StatusBadge status={s.status} />
            </div>
            <p className={cx("mt-2 text-xs tabular-nums", overdue ? "font-semibold text-red-600 dark:text-red-400" : "text-muted")}>
              promised {fmtDateTime(s.promisedDate)}{overdue && " — overdue"} · {fmtWeight(s.weightKg)}
            </p>
            {s.events[0]?.note && s.status === "EXCEPTION" && (
              <p className="mt-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-400">{s.events[0].note}</p>
            )}
            {s.currentLat != null && s.currentLng != null && (
              <p className="mt-2 text-xs text-muted">
                live pin {s.currentLat.toFixed(4)}, {s.currentLng.toFixed(4)}
                {s.locationUpdatedAt ? ` · ${fmtDateTime(s.locationUpdatedAt)}` : ""}
              </p>
            )}
            <div className="mt-4 grid grid-cols-2 gap-2">
              {actions.map((a) => (
                <form key={a} action={addEventAction} className="contents">
                  <input type="hidden" name="shipmentId" value={s.id} />
                  <input type="hidden" name="status" value={a} />
                  <input type="hidden" name="note" value={a === "DELIVERED" ? "Delivered by driver" : ""} />
                  <Button
                    size="sm"
                    type="submit"
                    variant={a === "EXCEPTION" ? "danger" : a === "DELIVERED" ? "primary" : "secondary"}
                    className="min-h-11"
                  >
                    {a === "EXCEPTION" ? "Report issue" : a.replaceAll("_", " ").toLowerCase()}
                  </Button>
                </form>
              ))}
              {s.status === "EXCEPTION" && (
                <form action={addEventAction} className="contents">
                  <input type="hidden" name="shipmentId" value={s.id} />
                  <input type="hidden" name="status" value="IN_TRANSIT" />
                  <input type="hidden" name="note" value="Issue resolved on site" />
                  <Button size="sm" type="submit" className="min-h-11 col-span-2">Back on route</Button>
                </form>
              )}
            </div>
            <a
              href={`geo:?q=${encodeURIComponent(s.destinationAddress)}`}
              className="mt-3 block text-center text-xs text-muted underline-offset-4 hover:underline"
            >
              open in maps app
            </a>
          </Card>
        );
      })}
    </main>
  );
}
