"use server";

import { revalidatePath } from "next/cache";
import { db } from "./db";
import { hashPassword } from "./password";
import { requireSession } from "./session";
import { teamUserSchema, vehicleSchema, warehouseSchema } from "./schemas";
import type { FormState } from "./auth-actions";

export async function createVehicleAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireSession(["DISPATCHER", "ADMIN"]);
  const parsed = vehicleSchema.safeParse({
    plateNo: formData.get("plateNo"),
    type: formData.get("type"),
    capacityKg: formData.get("capacityKg"),
    status: formData.get("status"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  try {
    await db.vehicle.create({ data: parsed.data });
  } catch {
    return { error: "A vehicle with that plate number already exists." };
  }
  revalidatePath("/dashboard/fleet");
  return null;
}

export async function createWarehouseAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireSession(["DISPATCHER", "ADMIN"]);
  const parsed = warehouseSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    address: formData.get("address"),
    city: formData.get("city"),
    lat: formData.get("lat"),
    lng: formData.get("lng"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  try {
    await db.warehouse.create({ data: parsed.data });
  } catch {
    return { error: "A warehouse with that code already exists." };
  }
  revalidatePath("/dashboard/warehouses");
  return null;
}

export async function createTeamUserAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireSession(["ADMIN"]);
  const parsed = teamUserSchema.safeParse({
    name: formData.get("name"),
    username: formData.get("username"),
    email: formData.get("email"),
    role: formData.get("role"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const clash = await db.user.findFirst({
    where: { OR: [{ username: parsed.data.username }, { email: parsed.data.email.toLowerCase() }] },
  });
  if (clash) return { error: "Username or email already in use." };
  const { password, ...fields } = parsed.data;
  await db.user.create({
    data: {
      ...fields,
      email: fields.email.toLowerCase(),
      passwordHash: await hashPassword(password),
      ...(parsed.data.role === "DRIVER" ? { driver: { create: { phone: "" } } } : {}),
    },
  });
  revalidatePath("/admin/team");
  return null;
}

export async function removeTeamUserAction(formData: FormData): Promise<void> {
  await requireSession(["ADMIN"]);
  const id = String(formData.get("id") ?? "");
  const victim = await db.user.findUnique({ where: { id } });
  if (!victim || victim.username === "admin") return;
  await db.user.delete({ where: { id } });
  revalidatePath("/admin/team");
}
