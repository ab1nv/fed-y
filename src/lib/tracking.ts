import { randomBytes } from "node:crypto";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function newTrackingCode(): string {
  const bytes = randomBytes(8);
  const seg = (a: number, b: number) =>
    Array.from(bytes.subarray(a, b), (x) => ALPHABET[x % ALPHABET.length]).join("");
  return `FDY-${seg(0, 4)}-${seg(4, 8)}`;
}
