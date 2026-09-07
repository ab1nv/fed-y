import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().trim().min(3).max(32),
  password: z.string().min(8).max(128),
});

export const signupSchema = z
  .object({
    name: z.string().trim().min(2).max(64),
    username: z
      .string()
      .trim()
      .regex(/^[a-z0-9_.]{3,32}$/, "3–32 chars: lowercase letters, digits, _ or ."),
    email: z.string().trim().email().max(128),
    phone: z.string().trim().min(8).max(20).optional().or(z.literal("")),
    password: z.string().min(8).max(128),
    role: z.enum(["DISPATCHER", "DRIVER"]),
  })
  .refine((d) => d.role !== "DRIVER" || (d.phone && d.phone.length >= 8), {
    message: "Phone number is required for driver accounts",
    path: ["phone"],
  });

export const shipmentCreateSchema = z.object({
  customerId: z.string().min(1, "Pick a customer"),
  originId: z.string().min(1, "Pick an origin warehouse"),
  destinationAddress: z.string().trim().min(5).max(240),
  destinationCity: z.string().trim().min(2).max(64),
  weightKg: z.coerce.number().positive().max(24000),
  promisedDate: z.coerce
    .date()
    .refine((d) => d.getTime() > Date.now() - 3600_000, "Promised date must be in the future"),
});

export const assignSchema = z.object({
  shipmentId: z.string().min(1),
  driverId: z.string().min(1),
});

export const eventSchema = z.object({
  shipmentId: z.string().min(1),
  status: z.enum([
    "ASSIGNED",
    "PICKED_UP",
    "IN_TRANSIT",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "EXCEPTION",
    "CANCELLED",
  ]),
  note: z.string().trim().max(500).optional().or(z.literal("")),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
});

export const vehicleSchema = z.object({
  plateNo: z.string().trim().toUpperCase().min(6).max(12),
  type: z.enum(["Van", "Truck", "Bike"]),
  capacityKg: z.coerce.number().int().positive().max(40000),
  status: z.enum(["AVAILABLE", "ON_ROUTE", "MAINTENANCE"]).default("AVAILABLE"),
});

export const warehouseSchema = z.object({
  name: z.string().trim().min(3).max(80),
  code: z.string().trim().toUpperCase().min(3).max(8),
  address: z.string().trim().min(5).max(240),
  city: z.string().trim().min(2).max(64),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

export const teamUserSchema = z.object({
  name: z.string().trim().min(2).max(64),
  username: z.string().trim().regex(/^[a-z0-9_.]{3,32}$/),
  email: z.string().trim().email(),
  role: z.enum(["ADMIN", "DISPATCHER", "DRIVER"]),
  password: z.string().min(8).max(128),
});

export const trackCodeSchema = z.string().trim().toUpperCase().min(8).max(16);
