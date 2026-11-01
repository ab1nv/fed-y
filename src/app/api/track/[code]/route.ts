import { NextResponse } from "next/server";
import { getPublicTracking } from "@/lib/track-query";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const shipment = await getPublicTracking(code);
  if (!shipment) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(shipment, { headers: { "Cache-Control": "no-store" } });
}
