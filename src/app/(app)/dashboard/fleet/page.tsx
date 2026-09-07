import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { Card, PageHeader, cx } from "@/components/ui";
import { AddVehicleForm } from "@/components/add-vehicle-form";

export const metadata = { title: "Fleet — FedY" };

const VEHICLE_STATUS: Record<string, { label: string; cls: string }> = {
  AVAILABLE: { label: "Available", cls: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400" },
  ON_ROUTE: { label: "On route", cls: "bg-blue-500/12 text-blue-700 dark:text-blue-400" },
  MAINTENANCE: { label: "Maintenance", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
};

export default async function FleetPage() {
  await requireSession(["DISPATCHER", "ADMIN"]);
  const [vehicles, drivers, openByDriver] = await Promise.all([
    db.vehicle.findMany({ orderBy: { plateNo: "asc" } }),
    db.driver.findMany({ include: { user: { select: { name: true, username: true } }, vehicle: true } }),
    db.shipment.groupBy({
      by: ["driverId"],
      where: {
        driverId: { not: null },
        status: { in: ["ASSIGNED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "EXCEPTION"] },
      },
      _count: { _all: true },
    }),
  ]);
  const openCount = new Map(openByDriver.map((o) => [o.driverId, o._count._all]));

  return (
    <>
      <PageHeader title="Fleet" sub={`${vehicles.length} vehicles · ${drivers.length} drivers`} />

      <Card className="mb-4 p-5">
        <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Add vehicle</h2>
        <AddVehicleForm />
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <h2 className="border-b border-line px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Vehicles</h2>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-line">
              {vehicles.map((v) => {
                const m = VEHICLE_STATUS[v.status];
                return (
                  <tr key={v.id}>
                    <td className="px-5 py-3">
                      <p className="font-mono text-[13px] font-medium">{v.plateNo}</p>
                      <p className="text-xs text-muted">{v.type} · {(v.capacityKg / 1000).toFixed(v.capacityKg < 1000 ? 2 : 1)} t capacity</p>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className={cx("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", m.cls)}>{m.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        <Card className="overflow-hidden">
          <h2 className="border-b border-line px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Drivers</h2>
          <ul className="divide-y divide-line">
            {drivers.map((d) => {
              const active = openCount.get(d.id) ?? 0;
              return (
                <li key={d.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand/15 text-sm font-semibold text-brand">
                    {d.user.name.slice(0, 1)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{d.user.name}</p>
                    <p className="truncate text-xs text-muted">
                      {d.vehicle ? `${d.vehicle.type} ${d.vehicle.plateNo}` : "no vehicle"} · {d.phone || "no phone"}
                    </p>
                  </div>
                  <span className={cx("text-xs tabular-nums", active ? "text-ink" : "text-muted")}>
                    {active} open
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </>
  );
}
