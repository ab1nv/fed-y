import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Customers — FedY" };

export default async function CustomersPage() {
  await requireSession(["DISPATCHER", "ADMIN"]);
  const customers = await db.customer.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { shipments: true } } },
  });

  return (
    <>
      <PageHeader title="Customers" sub={`${customers.length} accounts`} />
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.12em] text-muted">
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">City</th>
              <th className="px-4 py-3 font-semibold">Contact</th>
              <th className="px-4 py-3 text-right font-semibold">Shipments</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {customers.map((c) => (
              <tr key={c.id} className="transition hover:bg-surface2">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3 text-muted">{c.city}</td>
                <td className="px-4 py-3 text-xs text-muted">
                  {c.email}<br />{c.phone}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{c._count.shipments}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
