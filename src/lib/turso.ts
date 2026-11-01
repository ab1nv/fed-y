import { createClient, type Client } from "@libsql/client";

const globalForTurso = globalThis as { turso?: Client };

function makeClient(): Client {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) throw new Error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN.");
  return createClient({ url, authToken });
}

/**
 * Raw client for the public tracking endpoint. Prisma loads relations in
 * separate round trips; one JSON-aggregated query keeps the hot public API
 * fast against a remote Turso database.
 */
export const turso = globalForTurso.turso ?? makeClient();

if (process.env.NODE_ENV !== "production") globalForTurso.turso = turso;
