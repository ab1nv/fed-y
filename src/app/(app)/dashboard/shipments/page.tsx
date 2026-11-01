import Link from "next/link";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { computeRisk } from "@/lib/risk";
import type { ShipmentStatus } from "@/lib/state-machine";
import { PageHeader, RiskBadge, Select, StatusBadge, cx, fmtDate } from "@/components/ui";
import type { Prisma } from "@/generated/prisma/client";

export const metadata = { title: "Shipments — FedY" };

const ALL_STATUSES = [
  "CREATED", "ASSIGNED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "EXCEPTION", "CANCELLED",
] as const;
type Status = (typeof ALL_STATUSES)[number];

export default async function ShipmentsPage(props: {
  searchParams: Promise<{ status?: string; q?: string; driver?: string; page?: string }>;
}) {
  await requireSession(["DISPATCHER", "ADMIN"]);
  const sp = await props.searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const perPage = 25;
  const now = new Date();

  const where: Prisma.ShipmentWhereInput = {};
  const status = sp.status as Status | undefined;
  if (status && ALL_STATUSES.includes(status)) where.status = status;
  if (sp.driver) where.driverId = sp.driver;
  if (sp.q) {
    where.OR = [
      { trackingCode: { contains: sp.q } },
      { destinationCity: { contains: sp.q } },
      { destinationAddress: { contains: sp.q } },
      { customer: { name: { contains: sp.q } } },
    ];
  }

  const [shipments, total, drivers] = await Promise.all([
    db.shipment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        customer: { select: { name: true } },
        driver: { include: { user: { select: { name: true } } } },
        events: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
      },
    }),
    db.shipment.count({ where }),
    db.driver.findMany({ include: { user: { select: { name: true } } } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / perPage));

  const qs = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { ...sp, ...over };
    for (const k of ["status", "q", "driver", "page"] as const) {
      const v = merged[k];
      if (v && k !== "page") p.set(k, v);
    }
    if (Number(merged.page) > 1) p.set("page", String(merged.page));
    const s = p.toString();
    return s ? `?${s}` : "";
  };

  return (
    <>
      <PageHeader
        title="Shipments"
        sub={`${total} matching`}
        action={
          <Link href="/dashboard/shipments/new" className="inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-medium text-brand-ink transition hover:opacity-90">
            + New shipment
          </Link>
        }
      />

      <form className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]" action="/dashboard/shipments">
        <input
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="Search tracking code, city, address or customer…"
          className="h-10 rounded-lg border border-line bg-surface px-3 text-sm outline-none placeholder:text-muted/70 focus:border-brand/60 focus:ring-2 focus:ring-brand/25"
        />
        <Select name="status" defaultValue={sp.status ?? ""} className="sm:w-44">
          <option value="">All statuses</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{s.replaceAll("_", " ").toLowerCase().replace(/^\w/, (c) => c)}</option>
          ))}
        </Select>
        <Select name="driver" defaultValue={sp.driver ?? ""} className="sm:w-44">
          <option value="">All drivers</option>
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>{d.user.name}</option>
          ))}
        </Select>
        <button type="submit" className="h-10 rounded-lg bg-brand px-4 text-sm font-medium text-brand-ink transition hover:opacity-90">
          Filter
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.12em] text-muted">
              <th className="px-4 py-3 font-semibold">Tracking</th>
              <th className="px-4 py-3 font-semibold">Customer</th>
              <th className="px-4 py-3 font-semibold">Lane</th>
              <th className="px-4 py-3 font-semibold">Driver</th>
              <th className="px-4 py-3 font-semibold">Promised</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Risk</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {shipments.map((s) => (
              <tr key={s.id} className={cx("transition hover:bg-surface2", (s.status === "CREATED" || s.status === "ASSIGNED" || s.status === "PICKED_UP" || s.status === "IN_TRANSIT" || s.status === "OUT_FOR_DELIVERY" || s.status === "EXCEPTION") && "")}>
                <td className="px-4 py-3">
                  <Link href={`/dashboard/shipments/${s.id}`} className="font-mono text-[13px] font-medium text-brand underline-offset-4 hover:underline">
                    {s.trackingCode}
                  </Link>
                </td>
                <td className="max-w-40 truncate px-4 py-3">{s.customer.name}</td>
                <td className="whitespace-nowrap px-4 py-3 text-muted">→ {s.destinationCity}</td>
                <td className="whitespace-nowrap px-4 py-3">{s.driver?.user.name ?? <span className="text-muted italic">unassigned</span>}</td>
                <td className="whitespace-nowrap px-4 py-3 tabular-nums text-muted">{fmtDate(s.promisedDate)}</td>
                <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                <td className="px-4 py-3">
                  <RiskBadge level={computeRisk(s.status as ShipmentStatus, s.events[0]?.createdAt ?? null, s.promisedDate, now).level} />
                </td>
              </tr>
            ))}
            {shipments.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted">
                  No shipments match those filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Pagination">
          <span className="text-muted">Page {page} of {pages}</span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={qs({ page: String(page - 1) })} className="rounded-lg border border-line bg-surface px-3 py-1.5 transition hover:bg-surface2">← Prev</Link>
            )}
            {page < pages && (
              <Link href={qs({ page: String(page + 1) })} className="rounded-lg border border-line bg-surface px-3 py-1.5 transition hover:bg-surface2">Next →</Link>
            )}
          </div>
        </nav>
      )}
    </>
  );
}
