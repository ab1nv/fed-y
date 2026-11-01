import Link from "next/link";
import { getDashboardData } from "@/lib/dashboard-query";
import { requireSession } from "@/lib/session";
import { computeRisk } from "@/lib/risk";
import type { ShipmentStatus } from "@/lib/state-machine";
import { startOfIndiaDay } from "@/lib/time";
import { Card, PageHeader, RiskBadge, StatusBadge, cx, fmtDate, fmtDateTime } from "@/components/ui";
import { DeliveriesChart, StatusDonut } from "@/components/charts";

export const metadata = { title: "Overview — FedY" };

export default async function DashboardPage() {
  await requireSession(["DISPATCHER", "ADMIN"]);
  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30 * 86400_000);
  const firstDay = new Date(startOfIndiaDay(now).getTime() - 13 * 86400_000);

  const { statusCounts, delivered: deliveredEvents, recent: recentEvents, active } =
    await getDashboardData(monthAgo.toISOString());

  const activeCount = statusCounts.reduce((sum, m) => sum + m.n, 0);
  const exceptions = statusCounts.find((m) => m.status === "EXCEPTION")?.n ?? 0;
  const delivered = deliveredEvents.length;
  const lateDelivered = deliveredEvents.filter((e) => e.note?.includes("past")).length;

  // One query for 30 days of deliveries, bucketed into the 14-day chart here.
  const buckets = Array.from({ length: 14 }, (_, i) => {
    const start = new Date(firstDay.getTime() + i * 86400_000);
    return { start, key: start.getTime(), delivered: 0, late: 0 };
  });
  const byDay = new Map(buckets.map((b) => [b.key, b]));
  for (const event of deliveredEvents) {
    const bucket = byDay.get(startOfIndiaDay(new Date(event.createdAt)).getTime());
    if (!bucket) continue;
    if (event.note?.includes("past")) bucket.late += 1;
    else bucket.delivered += 1;
  }
  const daily = buckets.map((b) => ({ day: fmtDate(b.start), delivered: b.delivered, late: b.late }));

  const atRisk = active
    .map((s) => ({
      s,
      risk: computeRisk(
        s.status as ShipmentStatus,
        s.lastEventAt ? new Date(s.lastEventAt) : null,
        new Date(s.promisedDate),
        now,
      ),
    }))
    .filter((x) => x.risk.level !== "low")
    .sort((a, b) => b.risk.score - a.risk.score)
    .slice(0, 6);

  const kpis = [
    { label: "Active shipments", value: activeCount, href: "/dashboard/shipments", note: "in the pipeline right now" },
    {
      label: "On-time rate",
      value: delivered ? `${Math.round(((delivered - lateDelivered) / delivered) * 100)}%` : "—",
      href: "/dashboard/shipments",
      note: "last 30 days",
    },
    { label: "Open exceptions", value: exceptions, href: "/dashboard/shipments?status=EXCEPTION", note: "need attention" },
    { label: "Deliveries", value: delivered, href: "/dashboard/shipments?status=DELIVERED", note: "completed this month" },
  ];

  return (
    <>
      <PageHeader title="Good day." sub="Here is how the network looks right now." action={
        <Link href="/dashboard/shipments/new" className="inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-medium text-brand-ink transition hover:opacity-90">
          + New shipment
        </Link>
      } />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{k.label}</p>
            <p className="mt-2 font-display text-3xl font-semibold tabular-nums">{k.value}</p>
            <p className="mt-1 text-xs text-muted">{k.note}</p>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <DeliveriesChart data={daily} />
        <StatusDonut data={statusCounts.map((m) => ({ status: m.status, n: m.n }))} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">At risk</h2>
            <span className="text-xs text-muted">deterministic heuristic · stale updates, deadlines</span>
          </div>
          {atRisk.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">Nothing urgent. Network is healthy.</p>
          ) : (
            <ul className="divide-y divide-line">
              {atRisk.map(({ s, risk }) => (
                <li key={s.id} className="flex items-center gap-3 py-2.5">
                  <Link href={`/dashboard/shipments/${s.id}`} className="min-w-0 flex-1">
                    <p className="truncate font-mono text-[13px] font-medium">{s.trackingCode}</p>
                    <p className="truncate text-xs text-muted">
                      {s.destinationCity} · {risk.reasons[0] ?? ""}
                    </p>
                  </Link>
                  <span className="hidden text-xs text-muted sm:block">
                    {s.driverName ?? "unassigned"}
                  </span>
                  <StatusBadge status={s.status} />
                  <RiskBadge level={risk.level} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Live feed</h2>
          <ol className="relative space-y-4 before:absolute before:inset-y-1 before:left-[5px] before:w-px before:bg-line">
            {recentEvents.map((e) => (
              <li key={e.id} className="relative pl-5">
                <span className={cx("absolute left-0 top-1.5 size-[11px] rounded-full border-2 border-bg", e.status === "EXCEPTION" ? "bg-red-500" : e.status === "DELIVERED" ? "bg-emerald-500" : "bg-brand")} />
                <p className="text-sm">
                  <span className="capitalize">{e.status.replaceAll("_", " ").toLowerCase()}</span>{" "}
                  <Link href={`/dashboard/shipments/${e.shipmentId}`} className="font-mono text-[13px] text-brand underline-offset-2 hover:underline">
                    {e.trackingCode}
                  </Link>
                </p>
                <p className="text-xs text-muted">{fmtDateTime(new Date(e.createdAt))}{e.note ? ` — ${e.note}` : ""}</p>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </>
  );
}
