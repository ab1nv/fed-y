import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { Card, PageHeader } from "@/components/ui";
import { NewShipmentForm } from "@/components/new-shipment-form";
import { indiaDateTimeInput } from "@/lib/time";

export const metadata = { title: "New shipment — FedY" };

export default async function NewShipmentPage() {
  await requireSession(["DISPATCHER", "ADMIN"]);
  const [customers, warehouses] = await Promise.all([
    db.customer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, city: true } }),
    db.warehouse.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, code: true } }),
  ]);

  const tomorrow = defaultPromisedDate();

  return (
    <>
      <PageHeader title="New shipment" sub="Book a parcel into the network. A tracking code is generated on save." />
      <Card className="p-6">
        <NewShipmentForm customers={customers} warehouses={warehouses} defaultPromised={tomorrow} />
      </Card>
    </>
  );
}

function defaultPromisedDate(): string {
  return indiaDateTimeInput(new Date(Date.now() + 86400_000));
}
