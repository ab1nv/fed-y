import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const shipment = await db.shipment.findUnique({
    where: { trackingCode: decodeURIComponent(code).trim().toUpperCase() },
    include: {
      origin: { select: { name: true, city: true } },
      events: { orderBy: { createdAt: "asc" }, select: { status: true, note: true, createdAt: true } },
    },
  });
  if (!shipment) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({
    trackingCode: shipment.trackingCode,
    status: shipment.status,
    origin: shipment.origin,
    destination: { address: shipment.destinationAddress, city: shipment.destinationCity },
    weightKg: shipment.weightKg,
    promisedDate: shipment.promisedDate,
    events: shipment.events,
  });
}
