import "dotenv/config";
import { createClient } from "@libsql/client";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    console.error("Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in .env first.");
    process.exit(1);
  }

  const client = createClient({ url, authToken });

  const existing = await client.execute(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'Shipment'",
  );
  if (existing.rows.length > 0) {
    console.log("Schema already present — nothing to apply.");
    client.close();
    return;
  }

  const dir = "prisma/migrations";
  const files = readdirSync(dir)
    .filter((f) => /^\d/.test(f))
    .sort()
    .map((f) => join(dir, f, "migration.sql"));

  for (const file of files) {
    await client.executeMultiple(readFileSync(file, "utf8"));
    console.log(`Applied ${file}`);
  }

  client.close();
  console.log("Database ready. Run `pnpm db:seed` next.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
