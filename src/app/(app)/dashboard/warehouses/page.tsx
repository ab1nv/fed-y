import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { Card, PageHeader, cx } from "@/components/ui";

export const metadata = { title: "Warehouses — FedY" };

export default async function WarehousesPage() {
  await requireSession(["DISPATCHER", "ADMIN"]);
  const warehouses = await db.warehouse.findMany({
    include: { inventory: { orderBy: { name: "asc" } }, _count: { select: { originOf: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <PageHeader title="Warehouses" sub={`${warehouses.length} sites · stock and outbound volume`} />
      <div className="grid gap-4 md:grid-cols-2">
        {warehouses.map((w) => {
          const low = w.inventory.filter((i) => i.quantity <= i.reorderAt);
          return (
            <Card key={w.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-semibold">{w.name}</h2>
                  <p className="mt-0.5 text-xs text-muted">{w.address}, {w.city} · <span className="font-mono">{w.code}</span></p>
                </div>
                <span className="rounded-full bg-surface2 px-2.5 py-1 text-xs tabular-nums text-muted" title="shipments originating here">
                  {w._count.originOf} outbound
                </span>
              </div>
              <ul className="mt-4 divide-y divide-line rounded-lg border border-line">
                {w.inventory.map((i) => {
                  const lowStock = i.quantity <= i.reorderAt;
                  return (
                    <li key={i.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
                      <div className="min-w-0">
                        <p className="truncate">{i.name}</p>
                        <p className="font-mono text-[11px] text-muted">{i.sku}</p>
                      </div>
                      <span className={cx("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums", lowStock ? "bg-red-500/12 text-red-700 dark:text-red-400" : "bg-surface2 text-muted")}>
                        {lowStock ? "reorder · " : ""}{i.quantity}
                      </span>
                    </li>
                  );
                })}
                {w.inventory.length === 0 && (
                  <li className="px-3.5 py-3 text-sm text-muted">No inventory recorded.</li>
                )}
              </ul>
              {low.length > 0 && (
                <p className="mt-3 text-xs text-red-600 dark:text-red-400">{low.length} item(s) below reorder level.</p>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}
