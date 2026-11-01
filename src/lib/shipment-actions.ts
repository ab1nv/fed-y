"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "./db";
import { newTrackingCode } from "./tracking";
import { canTransition, type ShipmentStatus } from "./state-machine";
import { requireSession } from "./session";
import { assignSchema, eventSchema, shipmentCreateSchema } from "./schemas";
import type { FormState } from "./auth-actions";

export async function createShipmentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireSession(["DISPATCHER", "ADMIN"]);
  const parsed = shipmentCreateSchema.safeParse({
    customerId: formData.get("customerId"),
    originId: formData.get("originId"),
    destinationAddress: formData.get("destinationAddress"),
    destinationCity: formData.get("destinationCity"),
    weightKg: formData.get("weightKg"),
    promisedDate: formData.get("promisedDate"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const [customer, origin] = await Promise.all([
    db.customer.findUnique({ where: { id: parsed.data.customerId }, select: { id: true } }),
    db.warehouse.findUnique({ where: { id: parsed.data.originId }, select: { id: true } }),
  ]);
  if (!customer || !origin) return { error: "Pick a valid customer and origin warehouse." };

  const shipment = await db.shipment.create({
    data: {
      ...parsed.data,
      trackingCode: newTrackingCode(),
      events: { create: { status: "CREATED", note: "Order accepted" } },
    },
  });
  revalidatePath("/dashboard/shipments");
  redirect(`/dashboard/shipments/${shipment.id}`);
}

export async function assignDriverAction(formData: FormData): Promise<void> {
  await requireSession(["DISPATCHER", "ADMIN"]);
  const parsed = assignSchema.safeParse({
    shipmentId: formData.get("shipmentId"),
    driverId: formData.get("driverId"),
  });
  if (!parsed.success) return;

  const shipment = await db.shipment.findUnique({ where: { id: parsed.data.shipmentId } });
  if (!shipment) return;
  const driver = await db.driver.findUnique({ where: { id: parsed.data.driverId }, select: { id: true } });
  if (!driver) return;
  const moving = shipment.status === "CREATED" || shipment.status === "ASSIGNED";
  if (!moving) return;

  await db.$transaction([
    db.shipment.update({ where: { id: shipment.id }, data: { driverId: parsed.data.driverId, status: "ASSIGNED" } }),
    ...(shipment.status === "CREATED"
      ? [db.shipmentEvent.create({ data: { shipmentId: shipment.id, status: "ASSIGNED", note: "Driver assigned" } })]
      : [
          db.shipmentEvent.create({
            data: { shipmentId: shipment.id, status: "ASSIGNED", note: "Reassigned to another driver" },
          }),
        ]),
  ]);
  revalidatePath("/dashboard/shipments");
  revalidatePath(`/dashboard/shipments/${shipment.id}`);
  revalidatePath("/driver");
}

export async function addEventAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const parsed = eventSchema.safeParse({
    shipmentId: formData.get("shipmentId"),
    status: formData.get("status"),
    note: formData.get("note") || undefined,
    lat: formData.get("lat") || undefined,
    lng: formData.get("lng") || undefined,
  });
  if (!parsed.success) return;
  const { shipmentId, status, note, lat, lng } = parsed.data;

  const shipment = await db.shipment.findUnique({ where: { id: shipmentId } });
  if (!shipment) return;

  if (session.role === "DRIVER") {
    const driver = await db.driver.findUnique({ where: { userId: session.sub } });
    if (!driver || shipment.driverId !== driver.id) return;
    if (!["PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "EXCEPTION"].includes(status)) return;
  }
  if (!canTransition(shipment.status as ShipmentStatus, status as ShipmentStatus)) return;

  await db.$transaction([
    db.shipment.update({ where: { id: shipment.id }, data: { status: status as ShipmentStatus } }),
    db.shipmentEvent.create({
      data: { shipmentId: shipment.id, status: status as ShipmentStatus, note: note || undefined, lat, lng },
    }),
  ]);
  if (status === "DELIVERED" && shipment.driverId) {
    const open = await db.shipment.count({
      where: { driverId: shipment.driverId, status: { notIn: ["DELIVERED", "CANCELLED"] } },
    });
    if (open === 0) {
      const d = await db.driver.findUnique({ where: { id: shipment.driverId } });
      if (d?.vehicleId) await db.vehicle.update({ where: { id: d.vehicleId }, data: { status: "AVAILABLE" } });
    }
  }
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/shipments");
  revalidatePath(`/dashboard/shipments/${shipment.id}`);
  revalidatePath("/track/" + shipment.trackingCode);
  revalidatePath("/driver");
}
