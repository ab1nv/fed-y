import { describe, expect, it } from "vitest";
import { canTransition, nextActions, TRANSITIONS } from "./state-machine";
import { computeRisk } from "./risk";
import { hashPassword, verifyPassword } from "./password";
import { loginSchema, signupSchema } from "./schemas";

const H = 3600_000;
const now = new Date("2026-09-07T12:00:00Z");

describe("shipment state machine", () => {
  it("allows the happy lane", () => {
    expect(canTransition("CREATED", "ASSIGNED")).toBe(true);
    expect(canTransition("ASSIGNED", "PICKED_UP")).toBe(true);
    expect(canTransition("IN_TRANSIT", "OUT_FOR_DELIVERY")).toBe(true);
    expect(canTransition("OUT_FOR_DELIVERY", "DELIVERED")).toBe(true);
  });
  it("blocks skips and dead states", () => {
    expect(canTransition("CREATED", "DELIVERED")).toBe(false);
    expect(canTransition("DELIVERED", "IN_TRANSIT")).toBe(false);
    expect(canTransition("CANCELLED", "ASSIGNED")).toBe(false);
    for (const s of Object.keys(TRANSITIONS) as (keyof typeof TRANSITIONS)[]) {
      expect(TRANSITIONS[s].every((t) => canTransition(s, t))).toBe(true);
    }
  });
  it("restricts driver actions", () => {
    expect(nextActions("CREATED", true)).toEqual([]);
    expect(nextActions("IN_TRANSIT", true)).toEqual(["OUT_FOR_DELIVERY", "EXCEPTION"]);
    expect(nextActions("IN_TRANSIT", false)).toContain("EXCEPTION");
  });
});

describe("delay risk scoring", () => {
  it("is none for terminal states", () => {
    expect(computeRisk("DELIVERED", null, new Date(), now).level).toBe("none");
    expect(computeRisk("CANCELLED", null, new Date(), now).level).toBe("none");
  });
  it("is high when overdue and stale", () => {
    const r = computeRisk("IN_TRANSIT", new Date(now.getTime() - 20 * H), new Date(now.getTime() - 6 * H), now);
    expect(r.level).toBe("high");
    expect(r.reasons.some((x) => x.includes("Past promised"))).toBe(true);
  });
  it("escalates with silence", () => {
    const fresh = computeRisk("PICKED_UP", now, new Date(now.getTime() + 72 * H), now);
    const stale = computeRisk("PICKED_UP", new Date(now.getTime() - 25 * H), new Date(now.getTime() + 72 * H), now);
    expect(fresh.level).toBe("low");
    expect(stale.score).toBeGreaterThan(fresh.score);
    expect(stale.level).toBe("medium");
  });
});

describe("passwords", () => {
  it("round-trips scrypt", async () => {
    const h = await hashPassword("correct horse battery staple!");
    expect(h.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("correct horse battery staple!", h)).toBe(true);
    expect(await verifyPassword("wrong", h)).toBe(false);
    expect(await verifyPassword("x", "not-a-hash")).toBe(false);
  });
});

describe("schemas", () => {
  it("rejects short passwords", () => {
    expect(loginSchema.safeParse({ username: "admin", password: "short" }).success).toBe(false);
  });
  it("requires phone for drivers", () => {
    expect(
      signupSchema.safeParse({
        name: "Ravi K", username: "ravi", email: "r@x.io", password: "abcdefgh", role: "DRIVER",
      }).success,
    ).toBe(false);
    expect(
      signupSchema.safeParse({
        name: "Ravi K", username: "ravi", email: "r@x.io", phone: "+91 9811022334", password: "abcdefgh", role: "DRIVER",
      }).success,
    ).toBe(true);
  });
});
