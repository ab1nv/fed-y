import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { nextActions } from "@/lib/state-machine";
import { computeRisk } from "@/lib/risk";
import { addEventAction, assignDriverAction } from "@/lib/shipment-actions";
import { Button, Card, PageHeader, RiskBadge, Select, StatusBadge, Textarea, cx, fmtDateTime, fmtWeight } from "@/components/ui";

export const metadata = { title: "Shipment — FedY" };

export default async function ShipmentDetailPage(props: { params: Promise<{ id: string }> }) {
  await requireSession(["DISPATCHER", "ADMIN"]);
  const { id } = await props.params;

  const shipment = await db.shipment.findUnique({
    where: { id },
    include: {
      customer: true,
      origin: true,
      driver: { include: { user: true, vehicle: true } },
      events: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!shipment) notFound();

  const now = new Date();
  const risk = computeRisk(
    shipment.status,
    shipment.events[shipment.events.length - 1]?.createdAt ?? null,
    shipment.promisedDate,
    now,
  );
  const actions = nextActions(shipment.status, false);
  const drivers = shipment.status === "CREATED" || shipment.status === "ASSIGNED"
    ? await db.driver.findMany({ include: { user: { select: { name: true } }, vehicle: true } })
    : [];
  const canException = ["PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "EXCEPTION"].includes(shipment.status);

  return (
    <>
      <PageHeader
        title={shipment.trackingCode}
        sub={`${shipment.customer.name} · booked ${fmtDateTime(shipment.createdAt)}`}
        action={
          <div className="flex items-center gap-2">
            <StatusBadge status={shipment.status} />
            <RiskBadge level={risk.level} />
            <a href={`/track/${shipment.trackingCode}`} target="_blank" rel="noreferrer" className="text-xs text-brand underline-offset-4 hover:underline">
              public view ↗
            </a>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="p-5">
            <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Route</h2>
            <div className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted">Origin</p>
                <p className="mt-1 font-medium">{shipment.origin.name}</p>
                <p className="text-xs text-muted">{shipment.origin.address}, {shipment.origin.city}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Destination</p>
                <p className="mt-1 font-medium">{shipment.destinationAddress}</p>
                <p className="text-xs text-muted">{shipment.destLat?.toFixed(3)}, {shipment.destLng?.toFixed(3)}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Weight</p>
                <p className="mt-1 font-medium tabular-nums">{fmtWeight(shipment.weightKg)}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Promised delivery</p>
                <p className={cx("mt-1 font-medium tabular-nums", risk.score >= 4 && "text-red-600 dark:text-red-400")}>
                  {fmtDateTime(shipment.promisedDate)}
                  {shipment.promisedDate < now && shipment.status !== "DELIVERED" && " — overdue"}
                </p>
              </div>
            </div>
            {risk.reasons.length > 0 && (
              <p className="mt-4 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                <span className="font-semibold capitalize">{risk.level} risk:</span> {risk.reasons.join(" · ")}
              </p>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Event timeline</h2>
            <ol className="relative space-y-5 before:absolute before:inset-y-2 before:left-[5px] before:w-px before:bg-line">
              {[...shipment.events].reverse().map((e) => (
                <li key={e.id} className="relative pl-6">
                  <span className={cx(
                    "absolute left-0 top-1 size-[11px] rounded-full border-2 border-surface",
                    e.status === "EXCEPTION" || e.status === "CANCELLED" ? "bg-red-500" : e.status === "DELIVERED" ? "bg-emerald-500" : "bg-brand",
                  )} />
                  <p className="text-sm font-medium capitalize">{e.status.replaceAll("_", " ").toLowerCase()}</p>
                  <p className="text-xs text-muted">{fmtDateTime(e.createdAt)}{e.note ? ` — ${e.note}` : ""}</p>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Assignment</h2>
            {drivers.length > 0 ? (
              <form action={assignDriverAction} className="space-y-3">
                <input type="hidden" name="shipmentId" value={shipment.id} />
                <Select name="driverId" required defaultValue={shipment.driverId ?? ""}>
                  <option value="" disabled>Assign a driver…</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.user.name} — {d.vehicle ? `${d.vehicle.type} ${d.vehicle.plateNo}` : "no vehicle"}
                    </option>
                  ))}
                </Select>
                <Button type="submit" size="sm" className="w-full">Assign</Button>
              </form>
            ) : (
              <div className="text-sm">
                <p className="font-medium">{shipment.driver?.user.name ?? "Unassigned"}</p>
                {shipment.driver?.vehicle && (
                  <p className="mt-0.5 text-xs text-muted">
                    {shipment.driver.vehicle.type} · {shipment.driver.vehicle.plateNo} · {shipment.driver.phone}
                  </p>
                )}
              </div>
            )}
          </Card>

          {actions.length > 0 && (
            <Card className="p-5">
              <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Move status</h2>
              <div className="flex flex-wrap gap-2">
                {actions.filter((a) => a !== "EXCEPTION").map((a) => (
                  <form key={a} action={addEventAction}>
                    <input type="hidden" name="shipmentId" value={shipment.id} />
                    <input type="hidden" name="status" value={a} />
                    <Button size="sm" variant="secondary" type="submit">
                      {a.replaceAll("_", " ").toLowerCase()}
                    </Button>
                  </form>
                ))}
              </div>
              {canException && (
                <form action={addEventAction} className="mt-4 space-y-2">
                  <input type="hidden" name="shipmentId" value={shipment.id} />
                  <input type="hidden" name="status" value="EXCEPTION" />
                  <Textarea name="note" placeholder="Exception note (what went wrong?)" rows={2} required />
                  <Button size="sm" variant="danger" type="submit" className="w-full">Report exception</Button>
                </form>
              )}
            </Card>
          )}

          <Card className="p-5 text-sm">
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Customer</h2>
            <p className="font-medium">{shipment.customer.name}</p>
            <p className="mt-0.5 text-xs text-muted">{shipment.customer.email}</p>
            <p className="text-xs text-muted">{shipment.customer.phone}</p>
          </Card>

          <Link href="/dashboard/shipments" className="block text-center text-xs text-muted transition hover:text-ink">
            ← Back to shipments
          </Link>
        </div>
      </div>
    </>
  );
}
