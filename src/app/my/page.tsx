import Link from "next/link";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { minutesAgo } from "@/lib/geo";
import { MapPanel } from "@/components/map-panel";
import type { MapPoint } from "@/components/shipment-map";
import { Card, StatusBadge, cx, fmtDateTime, fmtWeight } from "@/components/ui";

export const metadata = { title: "My shipments — FedY" };

const CLOSED = ["DELIVERED", "CANCELLED"];

export default async function CustomerPage() {
  const session = await requireSession(["CUSTOMER"]);
  const customer = await db.customer.findUnique({
    where: { userId: session.sub },
    include: {
      shipments: {
        orderBy: { createdAt: "desc" },
        include: {
          origin: { select: { city: true, name: true } },
          events: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
  });

  if (!customer) {
    return (
      <main className="flex-1 p-4 text-sm text-muted">
        No customer profile is linked to this account yet. Ask an operator to link it.
      </main>
    );
  }

  const active = customer.shipments.filter((s) => !CLOSED.includes(s.status));
  const delivered = customer.shipments.filter((s) => s.status === "DELIVERED");

  const points: MapPoint[] = customer.shipments.flatMap((s) => {
    const hasPin = s.currentLat != null && s.currentLng != null;
    if (hasPin) {
      const age = s.locationUpdatedAt ? minutesAgo(s.locationUpdatedAt) : null;
      const live = age != null && age <= 20;
      return [{
        id: s.id,
        code: s.trackingCode,
        status: s.status,
        lat: s.currentLat as number,
        lng: s.currentLng as number,
        label: live ? "Driver location" : age != null ? `Last seen ${age} min ago` : "Last known location",
        live,
      }];
    }
    if (s.destLat != null && s.destLng != null) {
      return [{
        id: s.id,
        code: s.trackingCode,
        status: s.status,
        lat: s.destLat,
        lng: s.destLng,
        label: "Destination",
        live: false,
      }];
    }
    return [];
  });

  return (
    <main className="flex-1 space-y-4 p-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">Your account</p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">
          Parcels for {customer.name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {customer.city} · {customer.shipments.length} shipment{customer.shipments.length === 1 ? "" : "s"} booked
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Moving</p>
          <p className="mt-1 font-display text-2xl font-semibold tabular-nums">{active.length}</p>
        </Card>
        <Card className="p-3.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Delivered</p>
          <p className="mt-1 font-display text-2xl font-semibold tabular-nums">{delivered.length}</p>
        </Card>
        <Card className="p-3.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Total</p>
          <p className="mt-1 font-display text-2xl font-semibold tabular-nums">{customer.shipments.length}</p>
        </Card>
      </div>

      <MapPanel points={points} />

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-2">
          <h2 className="font-display text-lg font-semibold">Your shipments</h2>
          <Link href="/track" className="text-xs text-brand underline-offset-4 hover:underline">
            Track another
          </Link>
        </div>

        {customer.shipments.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted">
            No shipments yet. Your first booking will appear here.
          </Card>
        )}

        {customer.shipments.map((s) => {
          const latest = s.events[0];
          const pinAge = s.locationUpdatedAt ? minutesAgo(s.locationUpdatedAt) : null;
          return (
            <Card key={s.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-semibold text-brand">{s.trackingCode}</p>
                  <p className="mt-1 truncate text-sm font-medium">
                    {s.origin.city} → {s.destinationCity}
                  </p>
                  <p className="truncate text-xs text-muted">{s.destinationAddress}</p>
                </div>
                <StatusBadge status={s.status} />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                <span>{fmtWeight(s.weightKg)}</span>
                <span>
                  {s.status === "DELIVERED" && latest
                    ? `delivered ${fmtDateTime(latest.createdAt)}`
                    : `promised ${fmtDateTime(s.promisedDate)}`}
                </span>
                {s.currentLat != null && s.currentLng != null ? (
                  <span className={cx(pinAge != null && pinAge <= 20 && "text-emerald-600 dark:text-emerald-400")}>
                    {pinAge != null && pinAge <= 20 ? "live" : "last seen"} {pinAge ?? 0} min ago
                  </span>
                ) : (
                  <span>awaiting driver GPS</span>
                )}
              </div>

              <Link
                href={`/track/${s.trackingCode}`}
                className="mt-3 inline-block text-xs text-brand underline-offset-4 hover:underline"
              >
                Open live tracking →
              </Link>
            </Card>
          );
        })}
      </section>
    </main>
  );
}
