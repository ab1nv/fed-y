export type ShipmentStatus =
  | "CREATED"
  | "ASSIGNED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "EXCEPTION"
  | "CANCELLED";

export const TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  CREATED: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["PICKED_UP", "CANCELLED"],
  PICKED_UP: ["IN_TRANSIT", "EXCEPTION"],
  IN_TRANSIT: ["OUT_FOR_DELIVERY", "EXCEPTION"],
  OUT_FOR_DELIVERY: ["DELIVERED", "EXCEPTION"],
  EXCEPTION: ["IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

export const DRIVER_ACTIONS: ShipmentStatus[] = [
  "PICKED_UP",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "EXCEPTION",
];

export function canTransition(from: ShipmentStatus, to: ShipmentStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function nextActions(from: ShipmentStatus, isDriver: boolean): ShipmentStatus[] {
  const allowed = TRANSITIONS[from];
  return isDriver ? allowed.filter((s) => DRIVER_ACTIONS.includes(s)) : allowed;
}
