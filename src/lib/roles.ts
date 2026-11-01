export type Role = "ADMIN" | "DISPATCHER" | "DRIVER";

export const ROLES: Role[] = ["ADMIN", "DISPATCHER", "DRIVER"];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && ROLES.includes(value as Role);
}
