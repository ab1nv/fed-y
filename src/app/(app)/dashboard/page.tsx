import Link from "next/link";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { computeRisk } from "@/lib/risk";
import { Card, PageHeader, RiskBadge, StatusBadge, cx, fmtDate, fmtDateTime } from "@/components/ui";
import { DeliveriesChart, StatusDonut } from "@/components/charts";

export const metadata = { title: "Overview — FedY" };

const ACTIVE = ["ASSIGNED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "EXCEPTION"] as const;

export default async function DashboardPage() {
  await requireSession(["DISPATCHER", "ADMIN"]);
  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30 * 86400_000);

  const [activeCount, exceptions, delivered, lateDelivered, mix, recentEvents] = await Promise.all([
    db.shipment.count({ where: { status: { in: [...ACTIVE] } } }),
    db.shipment.count({ where: { status: "EXCEPTION" } }),
    db.shipment.count({ where: { status: "DELIVERED", createdAt: { gte: monthAgo } } }),
    db.shipment.count({
      where: {
        status: "DELIVERED",
        createdAt: { gte: monthAgo },
        events: { some: { status: "DELIVERED", note: "Delivered past promised window" } },
      },
    }),
    db.shipment.groupBy({ by: ["status"], where: { status: { in: [...ACTIVE] } }, _count: { _all: true } }),
    db.shipmentEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { shipment: { select: { trackingCode: true, id: true } } },
    }),
  ]);

  const daily = await Promise.all(
    Array.from({ length: 14 }, async (_, i) => {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - (13 - i));
      const end = new Date(start.getTime() + 86400_000);
      const [all, late] = await Promise.all([
        db.shipmentEvent.count({ where: { status: "DELIVERED", createdAt: { gte: start, lt: end } } }),
        db.shipmentEvent.count({
          where: {
            status: "DELIVERED",
            createdAt: { gte: start, lt: end },
            note: { contains: "past" },
          },
        }),
      ]);
      return { day: fmtDate(start), delivered: all - late, late };
    }),
  );

  const atRisk = (
    await db.shipment.findMany({
      where: { status: { in: [...ACTIVE] } },
      include: {
        driver: { include: { user: { select: { name: true } } } },
        events: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
      },
    })
  )
    .map((s) => ({
      s,
      risk: computeRisk(s.status, s.events[0]?.createdAt ?? null, s.promisedDate, now),
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
        <StatusDonut data={mix.map((m) => ({ status: m.status, n: m._count._all }))} />
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
                    {s.driver?.user.name ?? "unassigned"}
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
                  <Link href={`/dashboard/shipments/${e.shipment.id}`} className="font-mono text-[13px] text-brand underline-offset-2 hover:underline">
                    {e.shipment.trackingCode}
                  </Link>
                </p>
                <p className="text-xs text-muted">{fmtDateTime(e.createdAt)}{e.note ? ` — ${e.note}` : ""}</p>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </>
  );
}
