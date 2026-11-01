import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { minutesAgo, osmUrl } from "@/lib/geo";
import { normalizeTrackingCode } from "@/lib/tracking";
import { Logo, StatusBadge, cx, fmtDateTime, fmtWeight } from "@/components/ui";

export const metadata = { title: "Tracking — FedY" };
export const dynamic = "force-dynamic";

const STEPS = ["CREATED", "ASSIGNED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"] as const;
const LABELS: Record<string, string> = {
  CREATED: "Booked",
  ASSIGNED: "Assigned",
  PICKED_UP: "Picked up",
  IN_TRANSIT: "In transit",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  EXCEPTION: "Exception",
  CANCELLED: "Cancelled",
};

export default async function TrackPage(props: { params: Promise<{ code: string }> }) {
  const { code } = await props.params;
  const shipment = await db.shipment.findUnique({
    where: { trackingCode: normalizeTrackingCode(code) },
    include: {
      origin: true,
      customer: { select: { name: true } },
      driver: { include: { user: { select: { name: true } }, vehicle: { select: { plateNo: true, type: true } } } },
      events: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!shipment) notFound();

  const deliveredIdx = STEPS.indexOf(shipment.status as (typeof STEPS)[number]);
  const problem = shipment.status === "EXCEPTION" || shipment.status === "CANCELLED";
  const overdue = shipment.promisedDate < new Date() && deliveredIdx < 0 && !problem;
  const latest = shipment.events[shipment.events.length - 1];
  const lastNormal = [...shipment.events]
    .reverse()
    .find((e) => STEPS.includes(e.status as (typeof STEPS)[number]));
  const progressIdx = lastNormal ? STEPS.indexOf(lastNormal.status as (typeof STEPS)[number]) : 0;

  return (
    <main className="marketing min-h-dvh bg-bg text-ink">
      <header className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
        <Logo />
        <Link href="/track" className="text-sm text-muted transition hover:text-ink">Track another</Link>
      </header>

      <div className="mx-auto max-w-3xl px-5 pb-24">
        <p className="font-mono text-sm tracking-widest text-brand">{shipment.trackingCode}</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {LABELS[shipment.status]}
            {shipment.status === "OUT_FOR_DELIVERY" && " today"}
          </h1>
          <StatusBadge status={shipment.status} />
        </div>
        <p className="mt-2 text-sm text-muted">
          {shipment.origin.city} → {shipment.destinationCity} · {fmtWeight(shipment.weightKg)}
          {" · "}
          {shipment.status === "DELIVERED"
            ? `delivered ${latest ? fmtDateTime(latest.createdAt) : ""}`
            : `promised by ${fmtDateTime(shipment.promisedDate)}`}
          {overdue && <span className="font-semibold text-red-500"> — running late</span>}
        </p>

        {/* progress rail */}
        <div className="mt-10">
          <ol className="flex items-center">
            {STEPS.map((s, i) => {
              const reached = i <= progressIdx;
              const isCurrent = !problem && progressIdx === i;
              return (
                <li key={s} className={cx("flex items-center", i < STEPS.length - 1 && "flex-1")}>
                  <span className={cx(
                    "relative z-10 grid size-7 place-items-center rounded-full border-2 text-[10px] font-bold transition",
                    isCurrent ? "border-brand bg-brand text-brand-ink" : reached ? "border-brand/70 bg-brand/15 text-brand" : "border-line bg-surface text-muted",
                  )}>
                    {reached && !isCurrent ? "✓" : i + 1}
                  </span>
                  {i < STEPS.length - 1 && (
                    <span className={cx("h-0.5 flex-1", reached && i < progressIdx ? "bg-brand/70" : "bg-line")} />
                  )}
                </li>
              );
            })}
          </ol>
          <div className="mt-2 flex justify-between text-[10px] uppercase tracking-wide text-muted">
            <span>Booked</span>
            <span>On the way</span>
            <span>Delivered</span>
          </div>
        </div>

        <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-line bg-surface p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">From</p>
            <p className="mt-1.5 text-sm font-medium">{shipment.origin.name}</p>
            <p className="text-xs text-muted">{shipment.origin.city}</p>
          </div>
          <div className="rounded-xl border border-line bg-surface p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">To</p>
            <p className="mt-1.5 text-sm font-medium">{shipment.destinationCity}</p>
            <p className="truncate text-xs text-muted">{shipment.destinationAddress}</p>
          </div>
          <div className="rounded-xl border border-line bg-surface p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">On board</p>
            <p className="mt-1.5 text-sm font-medium">{shipment.driver?.user.name ?? "Awaiting driver"}</p>
            <p className="text-xs text-muted">{shipment.driver?.vehicle ? `${shipment.driver.vehicle.type} ${shipment.driver.vehicle.plateNo}` : "—"}</p>
          </div>
          <div className="rounded-xl border border-line bg-surface p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Live location</p>
            {shipment.currentLat != null && shipment.currentLng != null ? (
              <>
                <p className="mt-1.5 text-sm font-medium tabular-nums">
                  {shipment.currentLat.toFixed(4)}, {shipment.currentLng.toFixed(4)}
                </p>
                <p className="text-xs text-muted">
                  {shipment.locationUpdatedAt
                    ? `${minutesAgo(shipment.locationUpdatedAt) <= 10 ? "Updated" : "Last seen"} ${minutesAgo(shipment.locationUpdatedAt)} min ago`
                    : "Pinned"}
                </p>
                <a
                  href={osmUrl(shipment.currentLat, shipment.currentLng)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block text-xs text-brand underline-offset-4 hover:underline"
                >
                  open map ↗
                </a>
              </>
            ) : (
              <p className="mt-1.5 text-sm text-muted">Waiting for the driver&apos;s first GPS ping.</p>
            )}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-lg font-semibold">Shipment history</h2>
          <ol className="relative mt-5 space-y-6 before:absolute before:inset-y-2 before:left-[5px] before:w-px before:bg-line">
            {[...shipment.events].reverse().map((e) => (
              <li key={e.id} className="relative pl-6">
                <span className={cx(
                  "absolute left-0 top-1 size-[11px] rounded-full border-2 border-bg",
                  e.status === "EXCEPTION" || e.status === "CANCELLED" ? "bg-red-500" : e.status === "DELIVERED" ? "bg-emerald-500" : "bg-brand",
                )} />
                <p className="text-sm font-medium">{LABELS[e.status]}</p>
                <p className="text-xs text-muted">{fmtDateTime(e.createdAt)}{e.note ? ` — ${e.note}` : ""}</p>
              </li>
            ))}
          </ol>
        </section>

        <p className="mt-12 text-center text-xs text-muted">
          Problem with this shipment? Contact {shipment.customer.name} or your FedY rep.
        </p>
      </div>
    </main>
  );
}
