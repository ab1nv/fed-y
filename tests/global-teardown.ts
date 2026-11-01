import "dotenv/config";
import { createClient } from "@libsql/client";

/**
 * Remove rows created by the E2E suite. Demo/seed rows are left untouched.
 */
export default async function globalTeardown() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) return;

  const client = createClient({ url, authToken });
  const shipments = await client.execute(
    "SELECT id FROM Shipment WHERE destinationAddress LIKE 'E2E %' OR destinationAddress LIKE 'LOAD %'",
  );
  for (const row of shipments.rows) {
    await client.execute({ sql: "DELETE FROM ShipmentEvent WHERE shipmentId = ?", args: [row.id as string] });
    await client.execute({ sql: "DELETE FROM Shipment WHERE id = ?", args: [row.id as string] });
  }
  await client.execute("DELETE FROM Driver WHERE userId IN (SELECT id FROM User WHERE username LIKE 'e2e_%')");
  await client.execute("DELETE FROM User WHERE username LIKE 'e2e_%'");
  await client.execute("DELETE FROM Vehicle WHERE plateNo LIKE 'E2E%'");
  await client.execute("DELETE FROM Warehouse WHERE code LIKE 'E2E%'");
  client.close();
}
