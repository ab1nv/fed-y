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

  await client.execute(`
    CREATE TABLE IF NOT EXISTS "_fedy_migrations" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "appliedAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const appliedRows = await client.execute('SELECT "id" FROM "_fedy_migrations"');
  const applied = new Set(appliedRows.rows.map((r) => r[0] as string));

  const dir = "prisma/migrations";
  const migrations = readdirSync(dir)
    .filter((f) => /^\d/.test(f))
    .sort();

  // An existing database created before migration tracking started already
  // has the init schema. Record it as applied, then apply only new migrations.
  const legacy = await client.execute(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'Shipment'",
  );
  if (legacy.rows.length > 0 && applied.size === 0) {
    await client.execute({
      sql: 'INSERT INTO "_fedy_migrations" ("id") VALUES (?)',
      args: [migrations[0]],
    });
    applied.add(migrations[0]);
    console.log(`Baselined ${migrations[0]}`);
  }

  for (const migration of migrations) {
    if (applied.has(migration)) continue;
    const file = join(dir, migration, "migration.sql");
    await client.executeMultiple(readFileSync(file, "utf8"));
    await client.execute({
      sql: 'INSERT INTO "_fedy_migrations" ("id") VALUES (?)',
      args: [migration],
    });
    console.log(`Applied ${migration}`);
  }

  client.close();
  console.log("Database ready. Run `pnpm db:seed` next.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
