import { expect, test } from "@playwright/test";
import { createClient } from "@libsql/client";
import "dotenv/config";
import { login } from "./helpers";

const COUNT = 300;

test.describe.serial("bulk data and API load", () => {
  test.setTimeout(240_000);
  test.beforeAll(async () => {
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    });
    await client.execute("DELETE FROM ShipmentEvent WHERE shipmentId LIKE 'loadtest%'");
    await client.execute("DELETE FROM Shipment WHERE id LIKE 'loadtest%'");

    const customers = await client.execute("SELECT id FROM Customer LIMIT 8");
    const warehouses = await client.execute("SELECT id FROM Warehouse LIMIT 4");
    const drivers = await client.execute("SELECT id FROM Driver LIMIT 3");
    const now = Date.now();
    const statuses = ["CREATED", "ASSIGNED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"];

    const statements = [];
    for (let i = 0; i < COUNT; i++) {
      const status = statuses[i % statuses.length];
      const id = `loadtest${String(i).padStart(4, "0")}`;
      const code = `LDY-${String(i).padStart(4, "0")}-LOAD`;
      const promised = new Date(now + (i % 72) * 3600_000).toISOString();
      const created = new Date(now - (i % 240) * 3600_000).toISOString();
      statements.push({
        sql: `INSERT INTO Shipment
          (id, trackingCode, customerId, originId, destinationAddress, destinationCity,
           destLat, destLng, weightKg, status, driverId, promisedDate, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id, code, customers.rows[i % customers.rows.length][0], warehouses.rows[i % warehouses.rows.length][0],
          `LOAD ${i + 1}, Bulk Test Road, Loadville`, "Loadville", 19.07, 72.87,
          10 + (i % 500), status, status === "CREATED" ? null : drivers.rows[i % drivers.rows.length][0],
          promised, created, created,
        ],
      });
      statements.push({
        sql: "INSERT INTO ShipmentEvent (id, shipmentId, status, note, createdAt) VALUES (?, ?, 'CREATED', 'Bulk load test', ?)",
        args: [`loadtest-e${i}`, id, created],
      });
    }
    await client.batch(statements, "write");
    client.close();
  });

  test("pagination, filtering and KPIs survive a large table", async ({ page }) => {
    await login(page, "priya");
    await page.goto("/dashboard/shipments?q=Loadville");
    await expect(page.getByText("300 matching")).toBeVisible();
    await expect(page.getByText(/Page 1 of 12/)).toBeVisible();
    await expect(page.getByRole("row").nth(1)).toContainText("LDY-");

    await page.goto("/dashboard/shipments?q=Loadville&page=12");
    await expect(page.getByText(/Page 12 of 12/)).toBeVisible();
    await expect(page.getByRole("row").nth(1)).toContainText("LDY-");

    await page.goto("/dashboard/shipments?q=Loadville&status=DELIVERED");
    await expect(page.getByText("50 matching")).toBeVisible();

    await page.goto("/dashboard");
    await expect(page.getByText("Active shipments")).toBeVisible();
    await expect(page.getByRole("heading", { name: "At risk" })).toBeVisible();
  });

  test("tracking API answers every request under load", async ({ request }) => {
    const codes = Array.from({ length: COUNT }, (_, i) => `LDY-${String(i).padStart(4, "0")}-LOAD`);
    const started = Date.now();
    const results: number[] = [];
    const bad: { code: string; status: number }[] = [];
    for (let i = 0; i < codes.length; i += 25) {
      const batch = codes.slice(i, i + 25);
      const responses = await Promise.all(
        batch.map(async (code) => {
          const t = Date.now();
          let res = await request.get(`/api/track/${code}`);
          if (res.status() !== 200) {
            await new Promise((r) => setTimeout(r, 200));
            res = await request.get(`/api/track/${code}`);
          }
          results.push(Date.now() - t);
          if (res.status() !== 200) bad.push({ code, status: res.status() });
          return res.status();
        }),
      );
      expect(responses.every((s) => s === 200), JSON.stringify(bad.slice(0, 5))).toBe(true);
    }
    results.sort((a, b) => a - b);
    const p95 = results[Math.floor(results.length * 0.95)];
    console.log(`API load: ${codes.length} requests in ${Date.now() - started} ms, p95 ${p95} ms`);
    expect(p95).toBeLessThan(5_000);
  });
});
